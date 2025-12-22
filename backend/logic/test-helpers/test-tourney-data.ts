import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { dbClient } from "../../db-client";

interface TestPlayer {
  id: number;
  name: string;
}

interface TestResult {
  player: TestPlayer;
  points: number;
  place: number;
  faction: string;
}

export async function addTestTourneyData(db: Kysely<DB>) {
  const [JFV, James, Oz, Emma, Matt, Reice, Yan, Ed, Esme, Geraint, Boosey] =
    await db
      .insertInto("player")
      .values([
        { name: "JFV" },
        { name: "James" },
        { name: "Oz" },
        { name: "Emma" },
        { name: "Matt" },
        { name: "Reice" },
        { name: "Yan" },
        { name: "Ed" },
        { name: "Esme" },
        { name: "Geraint" },
        { name: "Boosey" },
      ])
      .returningAll()
      .execute();

  const tourney1Results: TestResult[] = [
    { player: JFV!, points: 15, place: 1, faction: "Resurrectionists" },
    { player: James!, points: 12, place: 2, faction: "Neverborn" },
    { player: Oz!, points: 10, place: 3, faction: "Guild" },
    { player: Emma!, points: 8, place: 4, faction: "Outcasts" },
    { player: Matt!, points: 6, place: 5, faction: "Ten Thunders" },
    { player: Reice!, points: 4, place: 6, faction: "Explorer's Society" },
    { player: Yan!, points: 2, place: 7, faction: "Arcanists" },
    { player: Ed!, points: 1, place: 8, faction: "Bayou" },
    { player: Esme!, points: 0, place: 9, faction: "Bayou" },
  ];

  const tourney2Results: TestResult[] = [
    { player: Emma!, points: 14, place: 1, faction: "Arcanists" },
    { player: James!, points: 12, place: 2, faction: "Guild" },
    { player: Matt!, points: 10, place: 3, faction: "Neverborn" },
    { player: JFV!, points: 8, place: 4, faction: "Resurrectionists" },
    { player: Oz!, points: 7, place: 5, faction: "Explorer's Society" },
    { player: Ed!, points: 5, place: 6, faction: "Bayou" },
    { player: Yan!, points: 3, place: 7, faction: "Ten Thunders" },
    { player: Esme!, points: 2, place: 8, faction: "Outcasts" },
    { player: Boosey!, points: 1, place: 9, faction: "Bayou" },
  ];

  const tourney3Results: TestResult[] = [
    { player: Geraint!, points: 16, place: 1, faction: "Guild" },
    { player: James!, points: 13, place: 2, faction: "Neverborn" },
    { player: Emma!, points: 11, place: 3, faction: "Arcanists" },
    { player: JFV!, points: 9, place: 4, faction: "Resurrectionists" },
    { player: Matt!, points: 7, place: 5, faction: "Ten Thunders" },
    { player: Oz!, points: 5, place: 6, faction: "Explorer's Society" },
    { player: Yan!, points: 3, place: 7, faction: "Bayou" },
    { player: Ed!, points: 2, place: 8, faction: "Bayou" },
    { player: Esme!, points: 1, place: 9, faction: "Outcasts" },
  ];

  const tourney4Results: TestResult[] = [
    { player: Matt!, points: 15, place: 1, faction: "Neverborn" },
    { player: Emma!, points: 13, place: 2, faction: "Arcanists" },
    { player: James!, points: 11, place: 3, faction: "Guild" },
    { player: Geraint!, points: 9, place: 4, faction: "Resurrectionists" },
    { player: JFV!, points: 7, place: 5, faction: "Explorer's Society" },
    { player: Oz!, points: 5, place: 6, faction: "Ten Thunders" },
    { player: Yan!, points: 3, place: 7, faction: "Bayou" },
    { player: Ed!, points: 2, place: 8, faction: "Bayou" },
    { player: Boosey!, points: 1, place: 9, faction: "Outcasts" },
  ];

  const tourney5Results: TestResult[] = [
    { player: Yan!, points: 14, place: 1, faction: "Ten Thunders" },
    { player: Geraint!, points: 12, place: 2, faction: "Guild" },
    { player: Emma!, points: 10, place: 3, faction: "Arcanists" },
    { player: James!, points: 8, place: 4, faction: "Neverborn" },
    { player: Matt!, points: 7, place: 5, faction: "Explorer's Society" },
    { player: JFV!, points: 5, place: 6, faction: "Resurrectionists" },
    { player: Oz!, points: 3, place: 7, faction: "Bayou" },
    { player: Ed!, points: 2, place: 8, faction: "Bayou" },
    { player: Esme!, points: 1, place: 9, faction: "Outcasts" },
  ];

  const tourney6Results: TestResult[] = [
    { player: Oz!, points: 15, place: 1, faction: "Guild" },
    { player: Emma!, points: 13, place: 2, faction: "Arcanists" },
    { player: Geraint!, points: 11, place: 3, faction: "Resurrectionists" },
    { player: James!, points: 9, place: 4, faction: "Neverborn" },
    { player: Matt!, points: 7, place: 5, faction: "Ten Thunders" },
    { player: JFV!, points: 5, place: 6, faction: "Explorer's Society" },
    { player: Yan!, points: 3, place: 7, faction: "Bayou" },
    { player: Ed!, points: 2, place: 8, faction: "Bayou" },
    { player: Boosey!, points: 1, place: 9, faction: "Outcasts" },
  ];

  const tourney7Results: TestResult[] = [
    { player: Esme!, points: 16, place: 1, faction: "Bayou" },
    { player: Geraint!, points: 13, place: 2, faction: "Guild" },
    { player: Emma!, points: 11, place: 3, faction: "Arcanists" },
    { player: James!, points: 9, place: 4, faction: "Neverborn" },
    { player: Matt!, points: 7, place: 5, faction: "Ten Thunders" },
    { player: JFV!, points: 5, place: 6, faction: "Resurrectionists" },
    { player: Oz!, points: 3, place: 7, faction: "Explorer's Society" },
    { player: Yan!, points: 2, place: 8, faction: "Bayou" },
    { player: Ed!, points: 1, place: 9, faction: "Outcasts" },
  ];

  await addResults(tourney1Results, "tourney 1", "2025-01-01", db);
  await addResults(tourney2Results, "tourney 2", "2025-02-01", db);
  await addResults(tourney3Results, "tourney 3", "2025-03-01", db);
  await addResults(tourney4Results, "tourney 4", "2025-04-01", db);
  await addResults(tourney5Results, "tourney 5", "2025-05-01", db);
  await addResults(tourney6Results, "tourney 6", "2025-06-01", db);
  await addResults(tourney7Results, "tourney 7", "2025-07-01", db);
}

async function addResults(
  tourneyResults: TestResult[],
  name: string,
  date: string,
  db: Kysely<DB>
) {
  const factions = await dbClient.selectFrom("faction").selectAll().execute();
  const factionMap = new Map(factions.map((f) => [f.name, f.id]));

  const tourney = await db
    .insertInto("tourney")
    .values({ name, date })
    .returningAll()
    .executeTakeFirstOrThrow();

  const values = tourneyResults.map((result) => ({
    tourney_id: tourney.id,
    player_id: result.player.id,
    points: result.points,
    place: result.place,
    faction_id: factionMap.get(result.faction)!,
  }));

  await db.insertInto("result").values(values).execute();
}
