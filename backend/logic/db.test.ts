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
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(30);
    expect(Bob!.total_points).toBe(39);
    expect(Charlie!.total_points).toBe(39);
    expect(David!.total_points).toBe(14);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(1);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });

  test("BEST_RESSER rankings", async () => {
    await generateRankings(dbClient, "BEST_RESSER");
    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();

    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("BEST_RESSER");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(3);
    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Alice!.rank).toBe(1);
    expect(Bob).toBeUndefined();
    expect(Charlie).toBeUndefined();
    expect(David!.total_points).toBe(9);
    expect(David!.rank).toBe(2);
    expect(Eve!.total_points).toBe(4);
    expect(Eve!.rank).toBe(3);
  });

  test("MASTERS rankings", async () => {
    await generateRankings(dbClient, "MASTERS", {
      playersNeededToBeMastersRanked: 4,
      numberOfTourneysToConsider: 5,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("MASTERS");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Bob!.total_points).toBe(29);
    expect(Charlie!.total_points).toBe(34);
    expect(David!.total_points).toBe(14);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(2);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });

  test("BEST X rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR", {
      playersNeededToBeMastersRanked: 10,
      numberOfTourneysToConsider: 1,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Bob!.total_points).toBe(19);
    expect(Charlie!.total_points).toBe(20);
    expect(David!.total_points).toBe(9);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(2);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });
});
