import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import { generateFactionRankings } from "../rankings/generate-faction-rankings";

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("Faction Rankings generation", () => {
  test("Generates faction rankings correctly", async () => {
    await generateFactionRankings(dbClient);

    const factionBatch = await dbClient
      .selectFrom("faction_snapshot_batch")
      .selectAll()
      .execute();

    expect(factionBatch.length).toBe(1);

    const snapshot = await dbClient
      .selectFrom("faction_snapshot")
      .selectAll()
      .where("batch_id", "=", factionBatch[0]!.id)
      .execute();

    expect(snapshot.length).toBe(4); // test data only contains Guild,neverborn,ressers,explorers
    expect(snapshot, "calculates Guild stats correctly").toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          faction_code: "GUILD",
          declarations: 3,
          total_points: 39,
          points_per_declaration: expect.closeTo(13),
        }),
      ]),
    );

    expect(
      snapshot,
      "calculates Neverborn and Ressers stats correctly",
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          faction_code: "NEVERBORN",
          declarations: 4,
          total_points: 44,
          points_per_declaration: expect.closeTo(11),
        }),
      ]),
    );

    expect(snapshot, "calculates Ressers stats correctly").toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          faction_code: "RESSERS",
          declarations: 3,
          total_points: 28,
          points_per_declaration: expect.closeTo(28 / 3),
        }),
      ]),
    );
  });
});
