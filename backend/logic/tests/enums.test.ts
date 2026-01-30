import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { Faction, RankingType } from "../fixtures";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("Testing the typescript enum values are represented properly in the db", () => {
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
        `Faction ${code} should exist in the database`,
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
        `RankingType ${code} should exist in the database`,
      ).toBe(1);
    }
  });
});
