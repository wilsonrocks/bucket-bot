import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { generateRankings } from "../rankings/generate-player-rankings";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("generating player rankings", () => {
  test("throws for invalid rankings type", async () => {
    await expect(
      generateRankings(dbClient, "NOT_A_REAL_TYPE"),
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

  test("saving events used for rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR", {
      playersNeededToBeMastersRanked: 10,
      numberOfTourneysToConsider: 2,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const events = await dbClient
      .selectFrom("ranking_snapshot_event")
      .innerJoin(
        "ranking_snapshot_batch",
        "ranking_snapshot_event.batch_id",
        "ranking_snapshot_batch.id",
      )
      .innerJoin("player", "ranking_snapshot_event.player_id", "player.id")
      .where("ranking_snapshot_batch.id", "=", snapshotBatch[0]!.id)
      .selectAll()
      .execute();

    // Charlie first

    const charlieEvents = events.filter((e) => e.name === "Charlie");

    expect(charlieEvents.length, "caps events at two").toBe(2);
    expect(charlieEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tourney_id: 2 }), // from tourney3
        expect.objectContaining({ tourney_id: 3 }), // from tourney2
      ]),
    );

    // then bob (who has same points for two)

    const bobEvents = events.filter((e) => e.name === "Bob");
    expect(bobEvents.length, "caps events at two").toBe(2);
    const bobTourneyIds = bobEvents.map((e) => e.tourney_id);
    expect(bobTourneyIds).toContain(2);
    expect(bobTourneyIds.some((id) => id === 1 || id === 3)).toBe(true); // from tourney2

    const eveEvents = events.filter((e) => e.name === "Eve");
    expect(eveEvents.length, "only one event for eve").toBe(1);
    expect(eveEvents[0]!.tourney_id).toBe(2); // from tourney2
  });
});
