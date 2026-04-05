import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { addTeamMember } from "../team-memberships";

const DISCORD_ALICE = "test-memberships-discord-alice";
const DISCORD_BOB = "test-memberships-discord-bob";
const DISCORD_UNKNOWN = "test-memberships-discord-unknown";
const TEAM_NAME = "test-memberships-Team Alpha";
const TEAM_NAME_2 = "test-memberships-Team Beta";

async function cleanup() {
  await dbClient.deleteFrom("membership")
    .where((eb) => eb("player_id", "in",
      eb.selectFrom("player").select("id").where("discord_id", "in", [DISCORD_ALICE, DISCORD_BOB])
    ))
    .execute();
  await dbClient.deleteFrom("player").where("discord_id", "in", [DISCORD_ALICE, DISCORD_BOB]).execute();
  await dbClient.deleteFrom("discord_user").where("discord_user_id", "in", [DISCORD_ALICE, DISCORD_BOB]).execute();
  await dbClient.deleteFrom("team").where("name", "in", [TEAM_NAME, TEAM_NAME_2]).execute();
}

let teamId: number;

beforeEach(async () => {
  await cleanup();
  await dbClient.insertInto("discord_user").values([
    { discord_user_id: DISCORD_ALICE, discord_display_name: "Alice", discord_username: "alice_user" },
    { discord_user_id: DISCORD_BOB, discord_username: "bob_user" },
  ]).execute();
  teamId = (
    await dbClient.insertInto("team").values({ name: TEAM_NAME }).returning("id").executeTakeFirstOrThrow()
  ).id;
});

afterEach(cleanup);

describe("addTeamMember", () => {
  test("returns discord_user_not_found when discord user does not exist", async () => {
    const result = await addTeamMember(dbClient, teamId, DISCORD_UNKNOWN, false);
    expect(result.type).toBe("discord_user_not_found");
  });

  test("creates a player row and membership for a discord user with no prior player", async () => {
    const result = await addTeamMember(dbClient, teamId, DISCORD_ALICE, false);

    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.playerName).toBe("Alice");
    expect(result.membership.team_id).toBe(teamId);
    expect(result.membership.is_captain).toBe(false);

    const player = await dbClient
      .selectFrom("player").selectAll().where("discord_id", "=", DISCORD_ALICE).executeTakeFirst();
    expect(player).toBeDefined();
    expect(player!.name).toBe("Alice");
  });

  test("uses discord_username as player name when display_name is null", async () => {
    const result = await addTeamMember(dbClient, teamId, DISCORD_BOB, false);

    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.playerName).toBe("bob_user");
  });

  test("reuses an existing player row without creating a duplicate", async () => {
    await dbClient.insertInto("player").values({ discord_id: DISCORD_ALICE, name: "Alice Existing" }).execute();

    const result = await addTeamMember(dbClient, teamId, DISCORD_ALICE, false);

    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.playerName).toBe("Alice Existing");

    const players = await dbClient
      .selectFrom("player").selectAll().where("discord_id", "=", DISCORD_ALICE).execute();
    expect(players).toHaveLength(1);
  });

  test("sets is_captain correctly", async () => {
    const result = await addTeamMember(dbClient, teamId, DISCORD_ALICE, true);

    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.membership.is_captain).toBe(true);
  });

  test("returns conflict when player already has an active membership", async () => {
    const teamId2 = (
      await dbClient.insertInto("team").values({ name: TEAM_NAME_2 }).returning("id").executeTakeFirstOrThrow()
    ).id;

    // Add to first team
    await addTeamMember(dbClient, teamId, DISCORD_ALICE, false);

    // Try to add to second team
    const result = await addTeamMember(dbClient, teamId2, DISCORD_ALICE, false);
    expect(result.type).toBe("conflict");
  });

  test("allows adding a player who previously left a team", async () => {
    const player = await dbClient
      .insertInto("player").values({ discord_id: DISCORD_ALICE, name: "Alice" }).returningAll().executeTakeFirstOrThrow();
    await dbClient
      .insertInto("membership")
      .values({ player_id: player.id, team_id: teamId, join_date: "2023-01-01" as any, left_date: "2024-01-01" as any })
      .execute();

    const teamId2 = (
      await dbClient.insertInto("team").values({ name: TEAM_NAME_2 }).returning("id").executeTakeFirstOrThrow()
    ).id;

    const result = await addTeamMember(dbClient, teamId2, DISCORD_ALICE, false);
    expect(result.type).toBe("success");
  });
});
