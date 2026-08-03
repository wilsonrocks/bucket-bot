import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { IdentityProvider } from "../../../logic/fixtures";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";
import { newBotEventHandler, newBotEventRoute } from "./new-bot-event";

type LeagueEntry = { uid: string; name: string; faction: string };

// Real entries from the captured payload, in finishing order. Note the mix of
// Firebase push ids and UUIDs — both formats occur in the same event. Ten
// players keeps us over calculatePoints' 8-player threshold, below which every
// place scores 0 and the importer refuses the event.
const REAL_LEAGUE: LeagueEntry[] = [
  { uid: "ErokenGeJQngdBYmiiNq", name: "Ben Salmon", faction: "ten-thunders" },
  { uid: "RMHgzyUhgpnZ5xg1WomN", name: "Reice Chaudhry", faction: "guild" },
  { uid: "e362cbcf-7cbc-4922-8143-1b8ff4f683e5", name: "Ollie Hedges", faction: "neverborn" },
  { uid: "DV0yLE8YuZYfJSa4jfTm", name: "Callum Palin", faction: "outcasts" },
  { uid: "c60ef994-f06a-4849-8665-b4b46eb96087", name: "Patryk Moskal", faction: "explorers-society" },
  { uid: "tCdANZ7h0bbO7eVzUo2l", name: "Kit Prakkamakul", faction: "neverborn" },
  { uid: "vEtQilUPUwxV0dzDsrhi", name: "Steven Thomson", faction: "guild" },
  { uid: "b8bd6cc0-ff76-4289-8688-83c2dbe7826f", name: "Milo Van Mesdag", faction: "arcanists" },
  { uid: "OhY7FeF5nMgXeBqNjH2a", name: "Sean Chambers-Gray", faction: "resurrectionists" },
  { uid: "60e4d4c0-fc1a-4e8a-acba-c48450bd7544", name: "David Laing", faction: "bayou" },
];

// Shape of the BOT4 payload, captured from
// https://bag-o-tools.web.app/api/event/VdWPmzd2vFvjKTn8qWiS. Keeps the fields
// the importer ignores (team/pts/vpf/vpa/vpd and the top-level `fixtures`
// block) so we prove they don't break parsing.
function botPayload(
  overrides: { botid?: string; league?: LeagueEntry[] } = {},
) {
  const league = overrides.league ?? REAL_LEAGUE;

  return {
    botid: overrides.botid ?? "VdWPmzd2vFvjKTn8qWiS",
    name: "Scottish Malifaux GT 2026",
    date: "2026-08-01",
    rounds: 4,
    location: "The Arena, Falkirk",
    fixtures: {
      round1: {
        deployment: "Standard",
        strategy: "Plant Explosives",
        schemes: ["Take the Highground", "Leave Your Mark"],
      },
    },
    league: league.map((entry, index) => ({
      position: index + 1,
      name: entry.name,
      faction: entry.faction,
      team: "Imaginary Friends",
      w: 3,
      d: 0,
      l: 1,
      pts: 9,
      vpf: 40,
      vpa: 30,
      vpd: 10,
      uid: entry.uid,
    })),
  };
}

function mockBotApi(...payloads: unknown[]) {
  const fetchMock = vi.fn(async () => {
    const body = payloads.length > 1 ? payloads.shift() : payloads[0];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Minimal stand-in for app.ts: db in context, same onError status mapping, and
// no JWT middleware (auth isn't what these tests are about).
function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    await next();
  });
  app.onError((err, c) => {
    const status = "status" in err ? Number(err.status) : 500;
    if (status === 500) console.error(err);
    return c.json({ error: err.message }, status as any);
  });
  app.openapi(newBotEventRoute, newBotEventHandler);
  return app;
}

function importEvent(app: ReturnType<typeof makeApp>, botEventId: string) {
  return app.request(`/bot-event/${botEventId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /bot-event/{id}", () => {
  test("creates the tourney, results and BOT4 identities", async () => {
    mockBotApi(botPayload());
    const response = await importEvent(makeApp(), "VdWPmzd2vFvjKTn8qWiS");
    expect(response.status).toBe(200);

    const { id } = (await response.json()) as { id: number };

    const tourney = await dbClient
      .selectFrom("tourney")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(tourney.bot_id).toBe("VdWPmzd2vFvjKTn8qWiS");
    expect(tourney.name).toBe("Scottish Malifaux GT 2026");
    expect(tourney.venue).toBe("The Arena, Falkirk");
    expect(tourney.rounds).toBe(4);
    expect(tourney.number_of_players).toBe(REAL_LEAGUE.length);

    const results = await dbClient
      .selectFrom("result")
      .innerJoin("player_identity", "player_identity.id", "result.player_identity_id")
      .where("result.tourney_id", "=", id)
      .select([
        "result.place",
        "result.rounds_played",
        "result.faction_code",
        "player_identity.external_id",
        "player_identity.provider_name",
        "player_identity.identity_provider_id",
      ])
      .orderBy("result.place")
      .execute();

    expect(results).toHaveLength(REAL_LEAGUE.length);
    expect(results.every((r) => r.identity_provider_id === IdentityProvider.BOT4)).toBe(true);
    // rounds_played is w + d + l, not the event's round count.
    expect(results.every((r) => r.rounds_played === 4)).toBe(true);

    // Identities are keyed by uid, with the display name kept for the admin UI.
    expect(results.map((r) => [r.external_id, r.provider_name])).toEqual(
      REAL_LEAGUE.map((entry) => [entry.uid, entry.name]),
    );

    // Every BOT4 faction slug maps, including the hyphenated ones.
    expect(results.map((r) => r.faction_code)).toEqual([
      "THUNDERS",
      "GUILD",
      "NEVERBORN",
      "OUTCASTS",
      "EXPLORER",
      "NEVERBORN",
      "GUILD",
      "ARCANISTS",
      "RESSERS",
      "BAYOU",
    ]);
  });

  test("reuses the identity when a player is renamed on BOT4", async () => {
    const [player, ...others] = REAL_LEAGUE;

    mockBotApi(
      botPayload({ botid: "event-one" }),
      botPayload({
        botid: "event-two",
        // Same uid, different display name — this is the case that used to
        // create a duplicate identity and placeholder player under BOT.
        league: [{ ...player!, name: "Benjamin Salmon" }, ...others],
      }),
    );

    const app = makeApp();
    expect((await importEvent(app, "event-one")).status).toBe(200);
    expect((await importEvent(app, "event-two")).status).toBe(200);

    const identities = await dbClient
      .selectFrom("player_identity")
      .where("identity_provider_id", "=", IdentityProvider.BOT4)
      .where("external_id", "=", player!.uid)
      .selectAll()
      .execute();

    expect(identities).toHaveLength(1);
    // The name is only captured when the identity is first created.
    expect(identities[0]!.provider_name).toBe("Ben Salmon");

    const resultCount = await dbClient
      .selectFrom("result")
      .where("player_identity_id", "=", identities[0]!.id)
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow();
    expect(Number(resultCount.count)).toBe(2);
  });

  test("rejects an event that has already been imported", async () => {
    mockBotApi(botPayload());
    const app = makeApp();

    expect((await importEvent(app, "VdWPmzd2vFvjKTn8qWiS")).status).toBe(200);

    const second = await importEvent(app, "VdWPmzd2vFvjKTn8qWiS");
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({
      error: "Event with BOT ID VdWPmzd2vFvjKTn8qWiS already exists",
    });

    const tourneys = await dbClient
      .selectFrom("tourney")
      .where("bot_id", "=", "VdWPmzd2vFvjKTn8qWiS")
      .selectAll()
      .execute();
    expect(tourneys).toHaveLength(1);
  });

  test("fails loudly on an unknown faction slug rather than importing it", async () => {
    mockBotApi(
      botPayload({
        botid: "bad-faction-event",
        league: REAL_LEAGUE.map((entry, index) =>
          // pre-BOT4 spelling, which BOT4 no longer emits
          index === 0 ? { ...entry, faction: "ten thunders" } : entry,
        ),
      }),
    );

    const response = await importEvent(makeApp(), "bad-faction-event");
    expect(response.status).toBe(500);

    const tourneys = await dbClient
      .selectFrom("tourney")
      .where("bot_id", "=", "bad-faction-event")
      .selectAll()
      .execute();
    expect(tourneys).toHaveLength(0);
  });

  test("returns 502 when the BOT API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));

    const response = await importEvent(makeApp(), "missing-event");
    expect(response.status).toBe(502);
  });
});
