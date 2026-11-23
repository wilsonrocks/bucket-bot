import { OpenAPIHono } from "@hono/zod-openapi";
import { parseHTML } from "linkedom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players";
import {
  newFrontierPlayersHtml,
  newFrontierTourneyHtml,
} from "../../../logic/longshanks/html";
import { calculatePoints } from "../../../logic/points";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";
import { newLongshanksEvent, newLongshanksEventRoute } from "./new-longshanks-event";

const NEW_FRONTIER_ID = "25681";

// New Frontier's standings cut down to the top `count` players, for events too
// small to award points.
function truncatedPlayersHtml(count: number): string {
  const { document } = parseHTML(newFrontierPlayersHtml);
  [...document.querySelectorAll("[class=player], [class='player drop']")]
    .slice(count)
    .forEach((el) => el.remove());
  return document.toString();
}

// New Frontier's standings with the first player's faction blanked out, as
// happens when a player never sets one on Longshanks.
function playersHtmlWithMissingFaction(): { html: string; longshanksId: string; name: string } {
  const { document } = parseHTML(newFrontierPlayersHtml);
  const el = document.querySelector("[class=player], [class='player drop']")!;
  el.querySelector(".factions")!.innerHTML = "";
  return {
    html: document.toString(),
    longshanksId: el.getAttribute("id")!.split("_")[1]!,
    name: el.querySelector(".player_link")!.textContent!.trim(),
  };
}

// The importer fetches two Longshanks pages: the standings panel and the event
// page. Serve the captured New Frontier HTML for each.
function mockLongshanks(playersHtml = newFrontierPlayersHtml) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const html = url.includes("panel_standings.php")
      ? playersHtml
      : newFrontierTourneyHtml;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
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
  app.openapi(newLongshanksEventRoute, newLongshanksEvent);
  return app;
}

function importEvent(
  app: ReturnType<typeof makeApp>,
  longshanksId: string,
  body: { tierCode?: string; factionOverrides?: Record<string, string> } = {},
) {
  return app.request(`/longshanks-event/${longshanksId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /longshanks-event/{id}", () => {
  test("creates the tourney and its results", async () => {
    mockLongshanks();
    const response = await importEvent(makeApp(), NEW_FRONTIER_ID);
    expect(response.status).toBe(200);

    const { id } = (await response.json()) as { id: number };

    const tourney = await dbClient
      .selectFrom("tourney")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(tourney.longshanks_id).toBe(NEW_FRONTIER_ID);
    expect(tourney.name).toBe("New Frontier");

    const players = extractPlayersFromLongshanksHTML(newFrontierPlayersHtml);
    const results = await dbClient
      .selectFrom("result")
      .where("tourney_id", "=", id)
      .selectAll()
      .execute();
    expect(results).toHaveLength(players.length);
  });

  test.each([
    { tierCode: "GT", max: 120 },
    { tierCode: "NATIONALS", max: 130 },
  ])("awards points using the $tierCode tier max of $max", async ({ tierCode, max }) => {
    mockLongshanks();
    const response = await importEvent(makeApp(), NEW_FRONTIER_ID, { tierCode });
    expect(response.status).toBe(200);

    const { id } = (await response.json()) as { id: number };

    const players = extractPlayersFromLongshanksHTML(newFrontierPlayersHtml);
    const results = await dbClient
      .selectFrom("result")
      .where("tourney_id", "=", id)
      .select("points")
      .orderBy("place")
      .execute();
    expect(results.map((r) => r.points)).toEqual(
      calculatePoints(players.length, max).points,
    );
    expect(results[0]!.points).toBe(max - Math.max(16 - players.length, 0));
    expect(results.at(-1)!.points).toBe(5);
  });

  test("imports an event with fewer than 8 players, awarding 0 points", async () => {
    const playersHtml = truncatedPlayersHtml(5);
    expect(extractPlayersFromLongshanksHTML(playersHtml)).toHaveLength(5);

    mockLongshanks(playersHtml);
    const response = await importEvent(makeApp(), NEW_FRONTIER_ID);
    expect(response.status).toBe(200);

    const { id } = (await response.json()) as { id: number };

    const tourney = await dbClient
      .selectFrom("tourney")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(tourney.number_of_players).toBe(5);

    const results = await dbClient
      .selectFrom("result")
      .where("tourney_id", "=", id)
      .select("points")
      .execute();
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.points === 0)).toBe(true);
  });

  test("rejects an event that has already been imported", async () => {
    mockLongshanks();
    const app = makeApp();

    const first = await importEvent(app, NEW_FRONTIER_ID);
    expect(first.status).toBe(200);
    const { id } = (await first.json()) as { id: number };

    const second = await importEvent(app, NEW_FRONTIER_ID);
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({
      error: `Tourney with longshanks id ${NEW_FRONTIER_ID} already exists with id ${id}`,
    });

    const tourneys = await dbClient
      .selectFrom("tourney")
      .where("longshanks_id", "=", NEW_FRONTIER_ID)
      .selectAll()
      .execute();
    expect(tourneys).toHaveLength(1);
  });

  describe("players with no faction on Longshanks", () => {
    test("rejects with 422 listing the players, and imports nothing", async () => {
      const missing = playersHtmlWithMissingFaction();
      mockLongshanks(missing.html);
      const response = await importEvent(makeApp(), NEW_FRONTIER_ID);
      expect(response.status).toBe(422);

      const body = (await response.json()) as {
        missingFactions: unknown[];
        factions: { code: string }[];
      };
      expect(body.missingFactions).toEqual([
        { longshanksId: missing.longshanksId, name: missing.name, longshanksFaction: null },
      ]);
      expect(body.factions.map((f) => f.code)).toContain("NEVERBORN");

      const tourneys = await dbClient
        .selectFrom("tourney")
        .where("longshanks_id", "=", NEW_FRONTIER_ID)
        .selectAll()
        .execute();
      expect(tourneys).toHaveLength(0);
    });

    test("imports using the supplied faction override", async () => {
      const missing = playersHtmlWithMissingFaction();
      mockLongshanks(missing.html);
      const response = await importEvent(makeApp(), NEW_FRONTIER_ID, {
        factionOverrides: { [missing.longshanksId]: "NEVERBORN" },
      });
      expect(response.status).toBe(200);
      const { id } = (await response.json()) as { id: number };

      const result = await dbClient
        .selectFrom("result")
        .innerJoin("player_identity", "player_identity.id", "result.player_identity_id")
        .where("result.tourney_id", "=", id)
        .where("player_identity.external_id", "=", missing.longshanksId)
        .select("result.faction_code")
        .executeTakeFirstOrThrow();
      expect(result.faction_code).toBe("NEVERBORN");
    });

    test("rejects an override with an unknown faction code", async () => {
      const missing = playersHtmlWithMissingFaction();
      mockLongshanks(missing.html);
      const response = await importEvent(makeApp(), NEW_FRONTIER_ID, {
        factionOverrides: { [missing.longshanksId]: "NOT_A_FACTION" },
      });
      expect(response.status).toBe(400);
    });
  });
});
