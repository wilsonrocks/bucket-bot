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
  removeTeamMemberHandler,
  removeTeamMemberRoute,
} from "./team-memberships";

const PLAYER_NAME = "test-remove-route-player";
const TEAM_NAME = "test-remove-route-Team Alpha";

// canAccessTeam gates on the ranking-reporter Discord role (or team captaincy).
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
  app.openapi(removeTeamMemberRoute, removeTeamMemberHandler);
  return app;
}

function removeMember(teamId: number, membershipId: number, mode?: string) {
  const query = mode ? `?mode=${mode}` : "";
  return makeApp().request(`/teams/${teamId}/members/${membershipId}${query}`, {
    method: "DELETE",
  });
}

async function cleanup() {
  await dbClient
    .deleteFrom("membership")
    .where((eb) =>
      eb("player_id", "in", eb.selectFrom("player").select("id").where("name", "=", PLAYER_NAME)),
    )
    .execute();
  await dbClient.deleteFrom("player").where("name", "=", PLAYER_NAME).execute();
  await dbClient.deleteFrom("team").where("name", "=", TEAM_NAME).execute();
}

let teamId: number;
let membershipId: number;

beforeEach(async () => {
  await cleanup();
  mockRankingReporter(true);

  teamId = (
    await dbClient.insertInto("team").values({ name: TEAM_NAME }).returning("id").executeTakeFirstOrThrow()
  ).id;
  const playerId = (
    await dbClient.insertInto("player").values({ name: PLAYER_NAME }).returning("id").executeTakeFirstOrThrow()
  ).id;
  membershipId = (
    await dbClient
      .insertInto("membership")
      .values({ player_id: playerId, team_id: teamId, join_date: "2020-01-01" as any })
      .returning("id")
      .executeTakeFirstOrThrow()
  ).id;
});

afterEach(cleanup);

describe("DELETE /teams/{teamId}/members/{membershipId}", () => {
  test("defaults to mode=leave when no mode is given", async () => {
    const response = await removeMember(teamId, membershipId);
    expect(response.status).toBe(200);

    const membership = await dbClient
      .selectFrom("membership").selectAll().where("id", "=", membershipId).executeTakeFirst();
    expect(membership).toBeDefined();
    expect(membership!.left_date).not.toBeNull();
  });

  test("mode=mistake deletes the membership", async () => {
    const response = await removeMember(teamId, membershipId, "mistake");
    expect(response.status).toBe(200);

    const membership = await dbClient
      .selectFrom("membership").selectAll().where("id", "=", membershipId).executeTakeFirst();
    expect(membership).toBeUndefined();
  });

  test("returns 403 and leaves the membership alone when the user cannot access the team", async () => {
    mockRankingReporter(false);

    const response = await removeMember(teamId, membershipId, "mistake");
    expect(response.status).toBe(403);

    const membership = await dbClient
      .selectFrom("membership").selectAll().where("id", "=", membershipId).executeTakeFirstOrThrow();
    expect(membership.left_date).toBeNull();
  });

  test("returns 404 for an unknown membership", async () => {
    const response = await removeMember(teamId, -1, "leave");
    expect(response.status).toBe(404);
  });

  test("returns 400 for an unrecognised mode", async () => {
    const response = await removeMember(teamId, membershipId, "banana");
    expect(response.status).toBe(400);
  });
});
