import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";

vi.mock("../../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../../logic/discord-client.js";
import {
  announceAchievementsHandler,
  announceAchievementsRoute,
  getAchievementsHandler,
  getAchievementsRoute,
  syncAchievementsHandler,
  syncAchievementsRoute,
  updateAchievementHandler,
  updateAchievementRoute,
} from "./achievements";

function mockRankingReporter(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: vi.fn().mockReturnValue(hasRole) } },
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
    c.set("jwtPayload", { id: "test-user" } as any);
    await next();
  });
  app.openapi(getAchievementsRoute, getAchievementsHandler);
  app.openapi(syncAchievementsRoute, syncAchievementsHandler);
  app.openapi(announceAchievementsRoute, announceAchievementsHandler);
  app.openapi(updateAchievementRoute, updateAchievementHandler);
  return app;
}

function update(id: string, body: object) {
  return makeApp().request(`/achievements/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PLAYER_NAME = "test-achievements-route-player";
let originalFirstEvent: Record<string, unknown>;

beforeEach(async () => {
  originalFirstEvent = await dbClient
    .selectFrom("achievement")
    .select(["name", "description", "flavour_text", "flavour_source", "image_key"])
    .where("id", "=", "first-event")
    .executeTakeFirstOrThrow();
  mockRankingReporter(true);
});

afterEach(async () => {
  await dbClient.updateTable("achievement").set(originalFirstEvent).where("id", "=", "first-event").execute();
  await dbClient.deleteFrom("player").where("name", "=", PLAYER_NAME).execute();
});

describe("GET /achievements", () => {
  test("lists achievements in display order with award counts", async () => {
    const before = (await (await makeApp().request("/achievements")).json()) as any[];
    const player = await dbClient
      .insertInto("player")
      .values({ name: PLAYER_NAME })
      .returning("id")
      .executeTakeFirstOrThrow();
    await dbClient
      .insertInto("player_achievement")
      .values({ player_id: player.id, achievement_id: "first-event", achieved_on: "2024-01-01" })
      .execute();

    const response = await makeApp().request("/achievements");
    expect(response.status).toBe(200);
    const body = (await response.json()) as any[];

    expect(body.map((a) => a.id)).toEqual(["first-event", "first-victory"]);
    const firstEvent = body.find((a) => a.id === "first-event");
    const firstEventBefore = before.find((a) => a.id === "first-event");
    expect(firstEvent.award_count).toBe(firstEventBefore.award_count + 1);
    expect(firstEvent.unannounced_count).toBe(firstEventBefore.unannounced_count + 1);
  });
});

describe("PUT /achievements/{id}", () => {
  test("updates the text and image", async () => {
    const response = await update("first-event", {
      name: "New Name",
      description: "Win best in faction",
      flavour_text: "New quote",
      flavour_source: "  ",
      image_key: "achievement/abc",
    });
    expect(response.status).toBe(200);

    const row = await dbClient
      .selectFrom("achievement")
      .selectAll()
      .where("id", "=", "first-event")
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      name: "New Name",
      description: "Win best in faction",
      flavour_text: "New quote",
      flavour_source: null,
      image_key: "achievement/abc",
    });
  });

  test("returns 404 for an unknown achievement", async () => {
    const response = await update("nope", {
      name: "x",
      description: "x",
      flavour_text: "y",
      flavour_source: null,
      image_key: null,
    });
    expect(response.status).toBe(404);
  });

  test("returns 403 for a non-reporter", async () => {
    mockRankingReporter(false);
    const response = await update("first-event", {
      name: "Hacked",
      description: "x",
      flavour_text: "y",
      flavour_source: null,
      image_key: null,
    });
    expect(response.status).toBe(403);
  });
});

function post(path: string) {
  return makeApp().request(path, { method: "POST" });
}

async function latestManualStep(stepKey: string) {
  return dbClient
    .selectFrom("pipeline_job_step")
    .select(["status", "trigger"])
    .where("step_key", "=", stepKey)
    .orderBy("id", "desc")
    .executeTakeFirst();
}

describe("POST /achievements/sync", () => {
  test("recalculates awards and records a manual pipeline step", async () => {
    await dbClient.deleteFrom("player_achievement").execute();

    const response = await post("/achievements/sync");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { inserted: number; updated: number; deleted: number };
    expect(body.updated).toBe(0);
    expect(body.deleted).toBe(0);

    const { count } = await dbClient
      .selectFrom("player_achievement")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow();
    expect(body.inserted).toBe(Number(count));

    expect(await latestManualStep("sync-achievements")).toEqual({
      status: "success",
      trigger: "manual",
    });
  });

  test("returns 403 for a non-reporter", async () => {
    mockRankingReporter(false);
    expect((await post("/achievements/sync")).status).toBe(403);
  });
});

describe("POST /achievements/announce-next", () => {
  test("returns a null player when nothing is waiting to be announced", async () => {
    await dbClient
      .updateTable("player_achievement")
      .set({ discord_message_id: "already-posted" })
      .where("discord_message_id", "is", null)
      .execute();

    const response = await post("/achievements/announce-next");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ playerId: null });
    expect(await latestManualStep("announce-achievements")).toEqual({
      status: "success",
      trigger: "manual",
    });
  });

  test("returns 403 for a non-reporter", async () => {
    mockRankingReporter(false);
    expect((await post("/achievements/announce-next")).status).toBe(403);
  });
});
