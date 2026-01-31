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

type TestResult = [number, TestPlayer, number, Faction, number];

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

  await Promise.all(
    players.map(async (player, idx) => {
      await db
        .insertInto("player_identity")
        .values({
          identity_provider_id: "LONGSHANKS",
          player_id: player.id,
          external_id: `LS-${idx}`,
          provider_name: player.name,
        })
        .execute();
    }),
  );

  const tourneys = await db
    .insertInto("tourney")
    .values(testTourneys)
    .execute();

  const tourney1Results: TestResult[] = [
    [1, Alice, 15, Faction.RESSERS, 3],
    [2, Bob, 10, Faction.GUILD, 3],
    [3, Charlie, 5, Faction.NEVERBORN, 3],
  ];

  const tourney2Results: TestResult[] = [
    [1, Bob, 19, Faction.GUILD, 4],
    [2, Charlie, 14, Faction.NEVERBORN, 4],
    [3, David, 9, Faction.RESSERS, 4],
    [4, Eve, 4, Faction.RESSERS, 4],
  ];

  const tourney3Results: TestResult[] = [
    [1, Charlie, 20, Faction.NEVERBORN, 4],
    [2, Alice, 15, Faction.EXPLORER, 4],
    [3, Bob, 10, Faction.GUILD, 4],
    [4, David, 5, Faction.NEVERBORN, 4],
  ];

  // tourney 4 is over a year ago and should not be included in recent rankings
  const tourney4Results: TestResult[] = [
    [1, Alice, 12, Faction.GUILD, 3],
    [2, David, 8, Faction.NEVERBORN, 3],
    [3, Eve, 4, Faction.RESSERS, 3],
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
    db: Kysely<DB>,
  ) {
    if (tourney.number_of_players !== results.length) {
      throw new Error(
        `Tourney ${tourney.name} should have ${tourney.number_of_players} results but has ${results.length}`,
      );
    }

    for (const [
      place,
      player,
      points,
      faction_code,
      rounds_played,
    ] of results) {
      const player_identity = await db
        .selectFrom("player_identity")
        .where("player_id", "=", player.id)
        .select("id")
        .executeTakeFirstOrThrow();

      db.insertInto("result")
        .values({
          tourney_id: tourney.id,
          player_identity_id: player_identity.id,
          points,
          place,
          faction_code,
          rounds_played,
        })
        .execute();
    }
  }
}
