import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { dbClient } from "../db-client";
import { addTestTourneyData } from "./test-helpers/test-tourney-data";
import { generateRankings } from "./generate-rankings";
import { Faction, RankingType } from "./fixtures";

beforeAll(async () => {
  await dbClient.deleteFrom("ranking_snapshot").execute();
  await dbClient.deleteFrom("ranking_snapshot_batch").execute();
  await dbClient.deleteFrom("result").execute();
  await dbClient.deleteFrom("tourney").execute();
  await dbClient.deleteFrom("player").execute();
  await addTestTourneyData(dbClient);
});

afterAll(async () => {
  // Any teardown after all tests run
});

describe.sequential("testing with containers exciting", () => {
  describe("database fixtures", () => {
    test("Faction enum has correct values", async () => {
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

    test("RankingType enum has correct values", async () => {
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
  });

  test("test fixtures worked okay", async () => {
    // Your test logic here

    const players = await dbClient.selectFrom("player").selectAll().execute();
    expect(players.length).toBe(11);

    const results = await dbClient.selectFrom("result").selectAll().execute();
    expect(results.length).toBe(63);
  });

  test("throws for invalid rankings type", async () => {
    await expect(
      generateRankings(dbClient, "NOT_A_REAL_TYPE")
    ).rejects.toThrowError("Invalid rankings type");
  });

  test("generates", async () => {
    await generateRankings(dbClient, "BEST_FOREVER");

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("BEST_FOREVER");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .fullJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(11); // 11 players

    expect(rankings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "James",
          rank: 3,
          total_points: 57,
        }),
        expect.objectContaining({
          name: "Emma",
          rank: 1,
          total_points: 62,
        }),
        expect.objectContaining({
          name: "Geraint",
          rank: 2,
          total_points: 61,
        }),
        expect.objectContaining({
          name: "JFV",
          rank: 5,
          total_points: 44,
        }),
        expect.objectContaining({
          name: "Matt",
          rank: 4,
          total_points: 46,
        }),
      ])
    );
  });
});
