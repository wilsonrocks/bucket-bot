import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { generateTeamRankings } from "../rankings/generate-team-rankings";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

const TEAM_ALPHA = "test-team-Alpha";
const TEAM_BETA = "test-team-Beta";

// Player IDs as seeded by addTestDataToDb (stable, defined in test-tourney-data.ts)
const ALICE_ID = 10001;
const BOB_ID = 10002;
const CHARLIE_ID = 10003;
const DAVID_ID = 10004;
const EVE_ID = 10005;

let teamAlphaId: number;
let teamBetaId: number;

async function cleanupTeamData() {
  await dbClient.deleteFrom("team_ranking_snapshot").execute();
  await dbClient.deleteFrom("team_ranking_snapshot_batch").execute();
  await dbClient.deleteFrom("membership").execute();
  await dbClient
    .deleteFrom("team")
    .where("name", "in", [TEAM_ALPHA, TEAM_BETA])
    .execute();
}

beforeEach(async () => {
  // Clean team data before addTestDataToDb, since it deletes players
  // and membership has a FK to player (no cascade)
  await cleanupTeamData();
  await addTestDataToDb(dbClient);

  teamAlphaId = (
    await dbClient
      .insertInto("team")
      .values({ name: TEAM_ALPHA })
      .returning("id")
      .executeTakeFirstOrThrow()
  ).id;
  teamBetaId = (
    await dbClient
      .insertInto("team")
      .values({ name: TEAM_BETA })
      .returning("id")
      .executeTakeFirstOrThrow()
  ).id;

  await dbClient
    .insertInto("membership")
    .values([
      { player_id: ALICE_ID, team_id: teamAlphaId, join_date: "2020-01-01" as any },
      { player_id: BOB_ID, team_id: teamAlphaId, join_date: "2020-01-01" as any },
      { player_id: CHARLIE_ID, team_id: teamAlphaId, join_date: "2020-01-01" as any },
      { player_id: DAVID_ID, team_id: teamBetaId, join_date: "2020-01-01" as any },
      { player_id: EVE_ID, team_id: teamBetaId, join_date: "2020-01-01" as any },
    ])
    .execute();
});

async function getLatestBatchRankings() {
  const batch = await dbClient
    .selectFrom("team_ranking_snapshot_batch")
    .selectAll()
    .orderBy("id", "desc")
    .executeTakeFirstOrThrow();

  const rankings = await dbClient
    .selectFrom("team_ranking_snapshot")
    .where("batch_id", "=", batch.id)
    .selectAll()
    .execute();

  return { batch, rankings };
}

describe("generateTeamRankings", () => {
  test("ROLLING_YEAR basic scores, ranks, new_team and rank_change", async () => {
    await generateTeamRankings(dbClient, "ROLLING_YEAR");

    const { batch, rankings } = await getLatestBatchRankings();
    expect(batch.type_code).toBe("ROLLING_YEAR");
    expect(rankings).toHaveLength(2);

    const alpha = rankings.find((r) => r.team_id === teamAlphaId)!;
    const beta = rankings.find((r) => r.team_id === teamBetaId)!;

    // Alice=30, Bob=39, Charlie=39 → 108
    expect(alpha.total_points).toBe(108);
    expect(alpha.rank).toBe(1);
    expect(alpha.new_team).toBe(true);
    expect(alpha.rank_change).toBeNull();

    // David=14, Eve=4 → 18
    expect(beta.total_points).toBe(18);
    expect(beta.rank).toBe(2);
    expect(beta.new_team).toBe(true);
    expect(beta.rank_change).toBeNull();
  });

  test("rank_change=0 and new_team=false on second batch with same data", async () => {
    await generateTeamRankings(dbClient, "ROLLING_YEAR");
    await generateTeamRankings(dbClient, "ROLLING_YEAR");

    const { rankings } = await getLatestBatchRankings();

    const alpha = rankings.find((r) => r.team_id === teamAlphaId)!;
    const beta = rankings.find((r) => r.team_id === teamBetaId)!;

    expect(alpha.rank_change).toBe(0);
    expect(alpha.new_team).toBe(false);
    expect(beta.rank_change).toBe(0);
    expect(beta.new_team).toBe(false);
  });

  test("numberOfTourneysToConsider=1 caps each player to their single best result", async () => {
    await generateTeamRankings(dbClient, "ROLLING_YEAR", {
      numberOfTourneysToConsider: 1,
      topPlayersPerTeam: 5,
      playersNeededToBeMastersRanked: 8,
    });

    const { rankings } = await getLatestBatchRankings();

    const alpha = rankings.find((r) => r.team_id === teamAlphaId)!;
    const beta = rankings.find((r) => r.team_id === teamBetaId)!;

    // Alice best=15, Bob best=19, Charlie best=20 → 54
    expect(alpha.total_points).toBe(54);
    expect(alpha.rank).toBe(1);

    // David best=9, Eve best=4 → 13
    expect(beta.total_points).toBe(13);
    expect(beta.rank).toBe(2);
  });

  test("topPlayersPerTeam=2 caps each team to its two highest-scoring players", async () => {
    await generateTeamRankings(dbClient, "ROLLING_YEAR", {
      topPlayersPerTeam: 2,
      numberOfTourneysToConsider: 5,
      playersNeededToBeMastersRanked: 8,
    });

    const { rankings } = await getLatestBatchRankings();

    const alpha = rankings.find((r) => r.team_id === teamAlphaId)!;
    const beta = rankings.find((r) => r.team_id === teamBetaId)!;

    // Alpha top 2: Bob(39) + Charlie(39) = 78 (Alice=30 excluded)
    expect(alpha.total_points).toBe(78);
    expect(alpha.rank).toBe(1);

    // Beta has only 2 players, both count: David(14) + Eve(4) = 18
    expect(beta.total_points).toBe(18);
    expect(beta.rank).toBe(2);
  });

  test("membership join_date filters out tournaments before a player joined", async () => {
    // Move Charlie's join_date to the far future — no tournaments qualify
    await dbClient
      .updateTable("membership")
      .set({ join_date: "2099-01-01" as any })
      .where("player_id", "=", CHARLIE_ID)
      .where("team_id", "=", teamAlphaId)
      .execute();

    await generateTeamRankings(dbClient, "ROLLING_YEAR");

    const { rankings } = await getLatestBatchRankings();

    const alpha = rankings.find((r) => r.team_id === teamAlphaId)!;
    const beta = rankings.find((r) => r.team_id === teamBetaId)!;

    // Charlie contributes 0 — only Alice(30) + Bob(39) = 69
    expect(alpha.total_points).toBe(69);
    expect(alpha.rank).toBe(1);

    expect(beta.total_points).toBe(18);
    expect(beta.rank).toBe(2);
  });
});
