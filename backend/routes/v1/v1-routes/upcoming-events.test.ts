import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";

vi.mock("../../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  ACHIEVEMENT_AIDE_ROLE_ID: "aide-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../../logic/discord-client.js";
import {
  getUpcomingEventsHandler,
  getUpcomingEventsRoute,
  setUpcomingEventOrganisersHandler,
  setUpcomingEventOrganisersRoute,
} from "./upcoming-events";

const PREFIX = "UPCOMING-ORG-TEST-";
const ALICE = `${PREFIX}alice`;
const BOB = `${PREFIX}bob`;

function mockRankingReporter(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: (id: string) => hasRole && id === "reporter-role-id" } },
          }),
        },
      }),
    },
  } as any);
}

function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    c.set("jwtPayload", { id: "test-editor" } as any);
    await next();
  });
  app.openapi(getUpcomingEventsRoute, getUpcomingEventsHandler);
  app.openapi(setUpcomingEventOrganisersRoute, setUpcomingEventOrganisersHandler);
  return app;
}

function setOrganisers(id: number, organiserDiscordIds: string[]) {
  return makeApp().request(`/upcoming-events/${id}/organisers`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organiser_discord_ids: organiserDiscordIds }),
  });
}

async function listedOrganisers(id: number): Promise<string[] | undefined> {
  const response = await makeApp().request("/upcoming-events");
  const events = (await response.json()) as { id: number; organiser_discord_ids: string[] }[];
  return events.find((e) => e.id === id)?.organiser_discord_ids;
}

let eventId: number;

beforeEach(async () => {
  mockRankingReporter(true);
  await dbClient.deleteFrom("upcoming_event").where("google_event_id", "like", `${PREFIX}%`).execute();
  await dbClient.deleteFrom("discord_user").where("discord_user_id", "like", `${PREFIX}%`).execute();
  await dbClient
    .insertInto("discord_user")
    .values([{ discord_user_id: ALICE }, { discord_user_id: BOB }])
    .execute();
  eventId = (
    await dbClient
      .insertInto("upcoming_event")
      .values({
        google_event_id: `${PREFIX}event`,
        name: "Organiser Test Event",
        starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning("id")
      .executeTakeFirstOrThrow()
  ).id;
});

describe("PUT /upcoming-events/{id}/organisers", () => {
  test("an event starts with no organisers", async () => {
    expect(await listedOrganisers(eventId)).toEqual([]);
  });

  test("sets several organisers, then replaces them", async () => {
    expect((await setOrganisers(eventId, [BOB, ALICE])).status).toBe(200);
    expect(await listedOrganisers(eventId)).toEqual([ALICE, BOB]);

    expect((await setOrganisers(eventId, [BOB])).status).toBe(200);
    expect(await listedOrganisers(eventId)).toEqual([BOB]);

    expect((await setOrganisers(eventId, [])).status).toBe(200);
    expect(await listedOrganisers(eventId)).toEqual([]);
  });

  test("ignores duplicate ids", async () => {
    expect((await setOrganisers(eventId, [ALICE, ALICE])).status).toBe(200);
    expect(await listedOrganisers(eventId)).toEqual([ALICE]);
  });

  test("404 for an unknown event", async () => {
    expect((await setOrganisers(-1, [ALICE])).status).toBe(404);
  });

  test("403 for non-reporters, leaving organisers unchanged", async () => {
    await setOrganisers(eventId, [ALICE]);
    mockRankingReporter(false);
    expect((await setOrganisers(eventId, [BOB])).status).toBe(403);
    expect(await listedOrganisers(eventId)).toEqual([ALICE]);
  });
});
