import { Kysely, InsertObject, InsertType, Insertable } from "kysely";
import { DB } from "kysely-codegen";
import { dbClient } from "../../db-client";
import { subMonths, format } from "date-fns";
import { number } from "zod";
import { Faction } from "../fixtures";

interface TestPlayer {
  id: number;
  name: string;
}

type TestResult = [number, TestPlayer, number, Faction];

const monthsAgo = (months: number): string => {
  const now = new Date();
  const then = subMonths(now, months);
  const formatted = format(then, "yyyy-MM-dd");
  return formatted;
};

const [Alice, Bob, Charlie, David, Eve] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
  { id: 4, name: "David" },
  { id: 5, name: "Eve" },
];

interface TestTourney {
  id: number;
  name: string;
  date: string;
  number_of_players: number;
}

const testTourneys: TestTourney[] = [
  { id: 1, name: "Tourney 1", date: monthsAgo(1), number_of_players: 3 },
  {
    id: 2,
    name: "Tourney 2 (masters)",
    date: monthsAgo(2),
    number_of_players: 4,
  },
  {
    id: 3,
    name: "Tourney 3 (masters)",
    date: monthsAgo(3),
    number_of_players: 4,
  },
  {
    id: 4,
    name: "Tourney 4 (Over a year ago)",
    date: monthsAgo(13),
    number_of_players: 3,
  },
] as const;

export async function addTestTourneyData(db: Kysely<DB>) {
  const players = await db
    .insertInto("player")
    .values([Alice, Bob, Charlie, David, Eve])
    .returningAll()
    .execute();

  const tourneys = await db
    .insertInto("tourney")
    .values(testTourneys)
    .execute();

  const tourney1Results: TestResult[] = [
    [1, Alice, 15, Faction.RESSERS],
    [2, Bob, 10, Faction.GUILD],
    [3, Charlie, 5, Faction.NEVERBORN],
  ];

  const tourney2Results: TestResult[] = [
    [1, Bob, 19, Faction.GUILD],
    [2, Charlie, 14, Faction.NEVERBORN],
    [3, David, 9, Faction.RESSERS],
    [4, Eve, 4, Faction.RESSERS],
  ];

  const tourney3Results: TestResult[] = [
    [1, Charlie, 20, Faction.NEVERBORN],
    [2, Alice, 15, Faction.RESSERS],
    [3, Bob, 10, Faction.GUILD],
    [4, David, 5, Faction.NEVERBORN],
  ];

  const tourney4Results: TestResult[] = [
    [1, Alice, 12, Faction.GUILD],
    [2, David, 8, Faction.NEVERBORN],
    [3, Eve, 4, Faction.RESSERS],
  ];

  await Promise.all([
    insertResults(testTourneys[0]!, tourney1Results, db),
    insertResults(testTourneys[1]!, tourney2Results, db),
    insertResults(testTourneys[2]!, tourney3Results, db),
    insertResults(testTourneys[3]!, tourney4Results, db),
  ]);

  async function insertResults(
    tourney: TestTourney,
    results: TestResult[],
    db: Kysely<DB>
  ) {
    if (tourney.number_of_players !== results.length) {
      throw new Error(
        `Tourney ${tourney.name} should have ${tourney.number_of_players} results but has ${results.length}`
      );
    }

    return db
      .insertInto("result")
      .values(
        results.map(([place, player, points, faction_code]) => ({
          tourney_id: tourney.id,
          player_id: player.id,
          points,
          place,
          faction_code,
        }))
      )
      .returningAll()
      .execute();
  }
}
