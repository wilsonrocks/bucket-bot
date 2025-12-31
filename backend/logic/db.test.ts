import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../db-client";
import { Faction, RankingType } from "./fixtures";
import { generateRankings } from "./rankings/generate-rankings";
import { addTestTourneyData } from "./test-helpers/test-tourney-data";

beforeEach(async () => {
  await dbClient.deleteFrom("ranking_snapshot_batch").execute();
  await dbClient.deleteFrom("ranking_snapshot").execute();
  await dbClient.deleteFrom("result").execute();
  await dbClient.deleteFrom("tourney").execute();
  await dbClient.deleteFrom("player").execute();
  await addTestTourneyData(dbClient);
});

afterAll(async () => {
  // Any teardown after all tests run
});

describe.sequential("testing with containers exciting", () => {
  test.sequential("Faction enum has correct values", async () => {
    for (const code of Object.values(Faction)) {
      expect(typeof code).toBe("string");
      const dbFaction = await dbClient
        .selectFrom("faction")
        .where("name_code", "=", code)
        .select("name_code")
        .execute();
      expect(
        dbFaction.length,
        `Faction ${code} should exist in the database`
      ).toBe(1);
    }
  });

  test.sequential("RankingType enum has correct values", async () => {
    for (const code of Object.values(RankingType)) {
      expect(typeof code).toBe("string");
      const dbRankingType = await dbClient
        .selectFrom("ranking_snapshot_type")
        .where("code", "=", code)
        .select("code")
        .execute();
      expect(
        dbRankingType.length,
        `RankingType ${code} should exist in the database`
      ).toBe(1);
    }
  });

  test.sequential("throws for invalid rankings type", async () => {
    await expect(
      generateRankings(dbClient, "NOT_A_REAL_TYPE")
    ).rejects.toThrowError("Invalid rankings type");
  });

  test("ROLLING_YEAR rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR");

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .fullJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);
    throw "stop";
    for (const { name, rank, total_points } of [
      { name: "James", rank: 2, total_points: 57 },
      { name: "Emma", rank: 1, total_points: 61 },
      { name: "Geraint", rank: 3, total_points: 48 },
      { name: "JFV", rank: 5, total_points: 44 },
      { name: "Matt", rank: 4, total_points: 46 },
    ]) {
      const playerRanking = rankings.find((r) => r.name === name);
      expect(
        playerRanking,
        `${playerRanking!.name} should have be in the rankings`
      ).toBeDefined();
      expect(
        playerRanking!.rank,
        `${playerRanking!.name} should have rank ${rank}`
      ).toBe(rank);
      expect(
        playerRanking!.total_points,
        `${playerRanking!.name} should have total points ${total_points}`
      ).toBe(total_points);
    }
  });

  test.skip("BEST_RESSER rankings", async () => {
    // throw JSON.stringify(
    //   await dbClient
    //     .selectFrom("result")
    //     .innerJoin("tourney", "tourney.id", "result.tourney_id")
    //     .innerJoin("player", "player.id", "result.player_id")
    //     .innerJoin("faction", "faction.id", "result.faction_id")
    //     .select([
    //       "player.name as player_name",
    //       "points",
    //       "faction.name as faction_name",
    //       "tourney.name as tourney_name",
    //     ])
    //     .execute(),
    //   null,
    //   2
    // );

    await generateRankings(dbClient, "BEST_RESSER");
    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .where("type_code", "=", "BEST_RESSER")
      .selectAll()
      .execute();

    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("BEST_RESSER");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin(
        "ranking_snapshot_batch",
        "ranking_snapshot.batch_id",
        "ranking_snapshot_batch.id"
      )
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .where("batch_id", "=", snapshotBatch[0]!.id)
      .select(["player.name as player_name", "rank", "total_points"])
      .execute();

    expect(rankings.length).toBe(2);

    for (const { name, rank, total_points } of [
      { name: "Geraint", rank: 2, total_points: 9 },
      { name: "JFV", rank: 1, total_points: 3 },
    ]) {
      const playerRanking = rankings.find((r) => r.player_name === name);

      expect(playerRanking).toBeDefined();

      expect(
        playerRanking,
        `${playerRanking!.player_name} should have be in the rankings`
      ).toBeDefined();
      expect(
        playerRanking!.rank,
        `${playerRanking!.player_name} should have rank ${rank}`
      ).toBe(rank);
      expect(
        playerRanking!.total_points,
        `${playerRanking!.player_name} should have total points ${total_points}`
      ).toBe(total_points);
    }
  });

  test.todo("MASTERS rankings");
});
