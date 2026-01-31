import { Kysely } from "kysely";
import { addTestTourneyData } from "./test-tourney-data";
import { DB } from "kysely-codegen";

export const addTestDataToDb = async (db: Kysely<DB>) => {
  await db.deleteFrom("ranking_snapshot_event").execute();
  await db.deleteFrom("ranking_snapshot_batch").execute();
  await db.deleteFrom("ranking_snapshot").execute();
  await db.deleteFrom("result").execute();
  await db.deleteFrom("tourney").execute();
  await db.deleteFrom("player_identity").execute();
  await db.deleteFrom("player").execute();
  await db.deleteFrom("faction_snapshot_batch").execute();
  await db.deleteFrom("faction_snapshot").execute();

  try {
    await addTestTourneyData(db);
  } catch (error) {
    console.error("Error in beforeEach setup:", error);
    throw error;
  }
};
