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

const AIDE_ROLE_ID = "aide-role-id";

/** Mocks the Discord member lookup so the user holds exactly `roleIds`. */
function mockRoles(...roleIds: string[]) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: (id: string) => roleIds.includes(id) } },
          }),
        },
      }),
    },
  } as any);
}

function mockRankingReporter(hasRole: boolean) {
  if (hasRole) mockRoles("reporter-role-id");
  else mockRoles();
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
    .select(["name", "group_name", "description", "flavour_text", "flavour_source", "image_key"])
    .where("id", "=", "FIRST_EVENT")
    .executeTakeFirstOrThrow();
  mockRankingReporter(true);
  process.env.ACHIEVEMENT_AIDE_ROLE_ID = AIDE_ROLE_ID;
});

afterEach(async () => {
  await dbClient.updateTable("achievement").set(originalFirstEvent).where("id", "=", "FIRST_EVENT").execute();
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
      .values({ player_id: player.id, achievement_id: "FIRST_EVENT", achieved_on: "2024-01-01" })
      .execute();

    const response = await makeApp().request("/achievements");
    expect(response.status).toBe(200);
    const body = (await response.json()) as any[];

    const orders = body.map((a) => a.display_order);
    expect(orders).toEqual([...orders].sort((x, y) => x - y));
    expect(body.map((a) => a.id)).toEqual(expect.arrayContaining(["FIRST_EVENT", "WIN_EVENT"]));
    const firstEvent = body.find((a) => a.id === "FIRST_EVENT");
    const firstEventBefore = before.find((a) => a.id === "FIRST_EVENT");
    expect(firstEvent.award_count).toBe(firstEventBefore.award_count + 1);
    expect(firstEvent.unannounced_count).toBe(firstEventBefore.unannounced_count + 1);
  });
});

describe("PUT /achievements/{id}", () => {
  test("rejects text long enough to break a Discord embed", async () => {
    const response = await update("FIRST_EVENT", {
      name: "Name",
      group_name: "General",
      description: "d",
      flavour_text: "x".repeat(1501),
      flavour_source: null,
      image_key: null,
    });
    expect(response.status).toBe(400);
  });

  test("updates the text and image", async () => {
    const response = await update("FIRST_EVENT", {
      name: "New Name",
      group_name: "Special",
      description: "Win best in faction",
      flavour_text: "New quote",
      flavour_source: "  ",
      image_key: "achievement/abc",
    });
    expect(response.status).toBe(200);

    const row = await dbClient
      .selectFrom("achievement")
      .selectAll()
      .where("id", "=", "FIRST_EVENT")
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      name: "New Name",
      group_name: "Special",
      description: "Win best in faction",
      flavour_text: "New quote",
      flavour_source: null,
      image_key: "achievement/abc",
    });
  });

  test("returns 404 for an unknown achievement", async () => {
    const response = await update("nope", {
      name: "x",
      group_name: "General",
      description: "x",
      flavour_text: "y",
      flavour_source: null,
      image_key: null,
    });
    expect(response.status).toBe(404);
  });

  test("returns 403 for a non-reporter", async () => {
    mockRankingReporter(false);
    const response = await update("FIRST_EVENT", {
      name: "Hacked",
      group_name: "General",
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

describe("achievement aides", () => {
  const validUpdate = {
    name: "Aide Name",
    group_name: "General",
    description: "d",
    flavour_text: "f",
    flavour_source: null,
    image_key: null,
  };

  test("can edit achievement details", async () => {
    mockRoles(AIDE_ROLE_ID);
    expect((await update("FIRST_EVENT", validUpdate)).status).toBe(200);
  });

  test("cannot recalculate or post to Discord", async () => {
    mockRoles(AIDE_ROLE_ID);
    expect((await post("/achievements/sync")).status).toBe(403);
    expect((await post("/achievements/announce-next")).status).toBe(403);
  });

  test("no one is an aide when the role id isn't configured", async () => {
    delete process.env.ACHIEVEMENT_AIDE_ROLE_ID;
    mockRoles(AIDE_ROLE_ID);
    expect((await update("FIRST_EVENT", validUpdate)).status).toBe(403);
  });
});
