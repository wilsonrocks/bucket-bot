import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { dbClient } from "../../db-client";
import { subMonths, format } from "date-fns";

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

const monthsAgo = (months: number): string => {
  const now = new Date();
  const then = subMonths(now, months);
  const formatted = format(then, "yyyy-MM-dd");
  return formatted;
};

export async function addTestTourneyData(db: Kysely<DB>) {
  const [
    JFV,
    James,
    Oz,
    Emma,
    Matt,
    Reice,
    Yan,
    Ed,
    Esme,
    Geraint,
    Boosey,
    Adam,
    Finch,
  ] = await db
    .insertInto("player")
    .values([
      { name: "Adam" },
      { name: "Boosey" },
      { name: "Ed" },
      { name: "Emma" },
      { name: "Esme" },
      { name: "Finch" },
      { name: "Geraint" },
      { name: "James" },
      { name: "JFV" },
      { name: "Matt" },
      { name: "Oz" },
      { name: "Reice" },
      { name: "Yan" },
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
    { player: Esme!, points: 0.8, place: 9, faction: "Bayou" },
    { player: Adam!, points: 0.4, place: 10, faction: "Guild" },
    { player: Finch!, points: 0.2, place: 11, faction: "Neverborn" },
    { player: Boosey!, points: 0.1, place: 12, faction: "Bayou" },
    { player: Geraint!, points: 0, place: 13, faction: "Outcasts" },
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

  // // Transform all tourney results into an object: { [playerName]: number[] }
  // const allResults = [
  //   tourney1Results,
  //   tourney2Results,
  //   tourney3Results,
  //   tourney4Results,
  //   tourney5Results,
  //   tourney6Results,
  //   tourney7Results,
  // ];

  // const playerPointsMap: Record<string, number[]> = {};

  // for (const results of allResults) {
  //   for (const result of results) {
  //     const name = result.player.name;
  //     if (!playerPointsMap[name]) {
  //       playerPointsMap[name] = [];
  //     }
  //     playerPointsMap[name].push(result.points);
  //   }
  // }

  // gives:
  // JFV: [
  //     15, 8, 9, 7,
  //    5, 5, 5
  // ], best 5 = 44
  // James: [
  //   12, 12, 13, 11,
  //  8,  9,  x9
  // ], best 5 = 57
  // Oz: [
  //   10,  7, 5, 5,
  //    3, 15, 3
  // ], best 5 = 42
  // Emma: [
  //    8, 14, 11, 13,
  //   10, 13, x11
  // ], best 5 = 61
  // Matt: [
  //   6, 10, 7, 15,
  //   7,  7, x7
  // ], best 5 =  46
  // Reice: [ 4 ], best 5 = 4
  // Yan: [
  //    2, 3, 3, 3,
  //   14, 3, 2
  // ], best 5 = 28
  // Ed: [
  //   1, 5, 2, 2,
  //   2, 2, 1
  // ], best 5 = 13
  // Esme: [ 0, 2, 1, 1, 16 ], best 5 = 20
  // Boosey: [ 1, 1, 1 ], best 5 = 3
  // Geraint: [ 16, 9, 12, 11, x13 ], best 5 = 48

  // playerPointsMap now contains: { [playerName]: [points, ...] }
  await addResults(tourney1Results, "tourney 1", monthsAgo(6), db);
  await addResults(tourney2Results, "tourney 2", monthsAgo(5), db);
  await addResults(tourney3Results, "tourney 3", monthsAgo(4), db);
  await addResults(tourney4Results, "tourney 4", monthsAgo(3), db);
  await addResults(tourney5Results, "tourney 5", monthsAgo(2), db);
  await addResults(tourney6Results, "tourney 6", monthsAgo(1), db);
  await addResults(tourney7Results, "tourney 7", monthsAgo(13), db);
}

async function addResults(
  tourneyResults: TestResult[],
  name: string,
  date: string,
  db: Kysely<DB>
) {
  const factions = await dbClient.selectFrom("faction").selectAll().execute();
  const factionMap = Object.fromEntries(factions.map((f) => [f.name, f.id]));

  const tourney = await db
    .insertInto("tourney")
    .values({ name, date, number_of_players: tourneyResults.length })
    .returningAll()
    .executeTakeFirstOrThrow();

  const values = tourneyResults.map((result) => ({
    tourney_id: tourney.id,
    player_id: result.player.id,
    points: result.points,
    place: result.place,
    faction_id: factionMap[result.faction]!,
  }));

  await db.insertInto("result").values(values).execute();
}
