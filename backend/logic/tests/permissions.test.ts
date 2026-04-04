import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

vi.mock("../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../logic/discord-client.js";
import { canAccessTeam, getCaptainTeamIds, isRankingReporter } from "../../routes/v1/permissions.js";

// ── constants & helpers ────────────────────────────────────────────────────

// High IDs avoid colliding with the explicit IDs 1–5 inserted by addTestDataToDb
const TEST_PLAYER_ALICE_ID = 9001;
const TEST_PLAYER_BOB_ID = 9002;
const TEST_DISCORD_ALICE = "test-permissions-discord-alice";
const TEST_DISCORD_BOB = "test-permissions-discord-bob";
const TEST_TEAM_ALPHA = "test-permissions-Team Alpha";
const TEST_TEAM_BETA = "test-permissions-Team Beta";

function makeMockDiscordClient(hasRole: boolean) {
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

async function insertTestPlayers(ids: number[]) {
  const users = ids.map((id) => ({
    discord_user_id: id === TEST_PLAYER_ALICE_ID ? TEST_DISCORD_ALICE : TEST_DISCORD_BOB,
    discord_username: id === TEST_PLAYER_ALICE_ID ? "alice" : "bob",
  }));
  await dbClient.insertInto("discord_user").values(users).execute();

  for (const id of ids) {
    await dbClient
      .insertInto("player")
      .values({
        id,
        name: id === TEST_PLAYER_ALICE_ID ? "Alice" : "Bob",
        discord_id: id === TEST_PLAYER_ALICE_ID ? TEST_DISCORD_ALICE : TEST_DISCORD_BOB,
      })
      .execute();
  }
}

async function cleanupTestData() {
  await dbClient.deleteFrom("membership").where("player_id", "in", [TEST_PLAYER_ALICE_ID, TEST_PLAYER_BOB_ID]).execute();
  await dbClient.deleteFrom("player").where("id", "in", [TEST_PLAYER_ALICE_ID, TEST_PLAYER_BOB_ID]).execute();
  await dbClient.deleteFrom("discord_user").where("discord_user_id", "in", [TEST_DISCORD_ALICE, TEST_DISCORD_BOB]).execute();
  await dbClient.deleteFrom("team").where("name", "in", [TEST_TEAM_ALPHA, TEST_TEAM_BETA]).execute();
}

// ── getCaptainTeamIds ──────────────────────────────────────────────────────

describe("getCaptainTeamIds", () => {
  let teamId: number;
  let otherTeamId: number;

  beforeEach(async () => {
    await cleanupTestData();
    await addTestDataToDb(dbClient);
    await insertTestPlayers([TEST_PLAYER_ALICE_ID, TEST_PLAYER_BOB_ID]);

    teamId = (
      await dbClient.insertInto("team").values({ name: TEST_TEAM_ALPHA }).returning("id").executeTakeFirstOrThrow()
    ).id;

    otherTeamId = (
      await dbClient.insertInto("team").values({ name: TEST_TEAM_BETA }).returning("id").executeTakeFirstOrThrow()
    ).id;
  });

  afterEach(cleanupTestData);

  test("returns team IDs where the player is an active captain", async () => {
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: true }).execute();

    const ids = await getCaptainTeamIds(TEST_DISCORD_ALICE, dbClient);
    expect(ids).toEqual([teamId]);
  });

  test("returns empty array when player is a member but not captain", async () => {
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: false }).execute();

    const ids = await getCaptainTeamIds(TEST_DISCORD_ALICE, dbClient);
    expect(ids).toEqual([]);
  });

  test("excludes memberships where left_date is set", async () => {
    await dbClient
      .insertInto("membership")
      .values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: true, join_date: "2023-01-01" as any, left_date: "2024-01-01" as any })
      .execute();

    const ids = await getCaptainTeamIds(TEST_DISCORD_ALICE, dbClient);
    expect(ids).toEqual([]);
  });

  test("cannot be an active member of two teams simultaneously", async () => {
    await dbClient
      .insertInto("membership")
      .values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: true })
      .execute();

    await expect(
      dbClient
        .insertInto("membership")
        .values({ player_id: TEST_PLAYER_ALICE_ID, team_id: otherTeamId, is_captain: true })
        .execute()
    ).rejects.toThrow("membership_no_overlapping_membership");
  });

  test("does not return teams captained by a different player", async () => {
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_BOB_ID, team_id: teamId, is_captain: true }).execute();

    const ids = await getCaptainTeamIds(TEST_DISCORD_ALICE, dbClient);
    expect(ids).toEqual([]);
  });

  test("returns empty array for unknown discord user", async () => {
    const ids = await getCaptainTeamIds("discord-nobody-xyz", dbClient);
    expect(ids).toEqual([]);
  });
});

// ── isRankingReporter ──────────────────────────────────────────────────────

describe("isRankingReporter", () => {
  test("returns true when member has the ranking reporter role", async () => {
    makeMockDiscordClient(true);
    expect(await isRankingReporter("some-user-id")).toBe(true);
  });

  test("returns false when member does not have the ranking reporter role", async () => {
    makeMockDiscordClient(false);
    expect(await isRankingReporter("some-user-id")).toBe(false);
  });
});

// ── canAccessTeam ──────────────────────────────────────────────────────────

describe("canAccessTeam", () => {
  let teamId: number;

  beforeEach(async () => {
    await cleanupTestData();
    await addTestDataToDb(dbClient);
    await insertTestPlayers([TEST_PLAYER_ALICE_ID]);

    teamId = (
      await dbClient.insertInto("team").values({ name: TEST_TEAM_ALPHA }).returning("id").executeTakeFirstOrThrow()
    ).id;
  });

  afterEach(cleanupTestData);

  test("returns true for a ranking reporter regardless of captaincy", async () => {
    makeMockDiscordClient(true);
    expect(await canAccessTeam(TEST_DISCORD_ALICE, teamId + 999, dbClient)).toBe(true);
  });

  test("returns true for a captain of the team", async () => {
    makeMockDiscordClient(false);
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: true }).execute();

    expect(await canAccessTeam(TEST_DISCORD_ALICE, teamId, dbClient)).toBe(true);
  });

  test("returns false for a captain of a different team", async () => {
    const otherTeamId = (
      await dbClient.insertInto("team").values({ name: TEST_TEAM_BETA }).returning("id").executeTakeFirstOrThrow()
    ).id;

    makeMockDiscordClient(false);
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_ALICE_ID, team_id: otherTeamId, is_captain: true }).execute();

    expect(await canAccessTeam(TEST_DISCORD_ALICE, teamId, dbClient)).toBe(false);
  });

  test("returns false for a non-captain member", async () => {
    makeMockDiscordClient(false);
    await dbClient.insertInto("membership").values({ player_id: TEST_PLAYER_ALICE_ID, team_id: teamId, is_captain: false }).execute();

    expect(await canAccessTeam(TEST_DISCORD_ALICE, teamId, dbClient)).toBe(false);
  });

  test("returns false for a user with no role and no captaincy", async () => {
    makeMockDiscordClient(false);
    expect(await canAccessTeam("discord-nobody-xyz", teamId, dbClient)).toBe(false);
  });
});
