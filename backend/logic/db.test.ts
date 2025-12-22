import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { dbClient } from "../db-client";
import { addTestTourneyData } from "./test-helpers/test-tourney-data";
import { generateRankings } from "./generate-rankings";

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

  test("generates a snapshot", async () => {
    await generateRankings(dbClient, "BEST_FOREVER");

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("BEST_FOREVER");

    const jamesId = await dbClient
      .selectFrom("player")
      .where("name", "=", "James")
      .select("id")
      .executeTakeFirstOrThrow();

    const jamesSnapshot = await dbClient
      .selectFrom("ranking_snapshot")
      .where("batch_id", "=", snapshotBatch[0]!.id)
      .where("player_id", "=", jamesId.id)
      .selectAll()
      .executeTakeFirstOrThrow();

    const emmaId = await dbClient
      .selectFrom("player")
      .where("name", "=", "Emma")
      .select("id")
      .executeTakeFirstOrThrow();

    const emmaSnapshot = await dbClient
      .selectFrom("ranking_snapshot")
      .where("batch_id", "=", snapshotBatch[0]!.id)
      .where("player_id", "=", emmaId.id)
      .selectAll()
      .executeTakeFirstOrThrow();

    expect(jamesSnapshot.total_points).toBe(57);
    expect(emmaSnapshot.total_points).toBe(62);
  });
});
