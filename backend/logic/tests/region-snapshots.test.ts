import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { generateRegionSnapshot } from "../rankings/generate-region-snapshots";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import {
  TEST_REGION_LONDON,
  TEST_REGION_NORTH_WEST,
} from "../test-helpers/test-tourney-data";

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("Region snapshot generation", () => {
  test("creates a batch and one snapshot row per region", async () => {
    await generateRegionSnapshot(dbClient);

    const batches = await dbClient
      .selectFrom("region_snapshot_batch")
      .selectAll()
      .execute();
    expect(batches.length).toBe(1);

    const snapshots = await dbClient
      .selectFrom("region_snapshot")
      .selectAll()
      .where("batch_id", "=", batches[0]!.id)
      .execute();

    // One row per region (12 UK regions seeded by migration)
    expect(snapshots.length).toBe(12);
  });

  test("counts only events within the rolling year window", async () => {
    await generateRegionSnapshot(dbClient);

    const [batch] = await dbClient
      .selectFrom("region_snapshot_batch")
      .selectAll()
      .execute();

    const snapshots = await dbClient
      .selectFrom("region_snapshot")
      .selectAll()
      .where("batch_id", "=", batch!.id)
      .execute();

    // Tourney 1 (1 month ago) + Tourney 2 (2 months ago) are in North West
    // Tourney 4 (13 months ago) is also in North West but excluded from rolling year
    const nwSnapshot = snapshots.find(
      (s) => s.region_id === TEST_REGION_NORTH_WEST,
    );
    expect(nwSnapshot!.event_count).toBe(2);

    // Tourney 3 (3 months ago) is in London
    const londonSnapshot = snapshots.find(
      (s) => s.region_id === TEST_REGION_LONDON,
    );
    expect(londonSnapshot!.event_count).toBe(1);

    // All other regions have no events
    const otherSnapshots = snapshots.filter(
      (s) =>
        s.region_id !== TEST_REGION_NORTH_WEST &&
        s.region_id !== TEST_REGION_LONDON,
    );
    expect(otherSnapshots.every((s) => s.event_count === 0)).toBe(true);
  });
});
