import { sql } from "kysely";
import { Kysely } from "kysely";
import { DB } from "kysely-codegen";

export type CommunityTotals = {
  totalPlayers: number;
  gamesPlayed: number;
  totalEvents: number;
};

export async function getCommunityTotals(db: Kysely<DB>): Promise<CommunityTotals> {
  const row = await db
    .selectFrom("result")
    .innerJoin("player_identity", "result.player_identity_id", "player_identity.id")
    .select((eb) => [
      eb.fn.sum("rounds_played").as("games_played"),
      sql`COUNT(DISTINCT tourney_id)`.as("total_events"),
      sql`COUNT(DISTINCT player_identity.player_id)`.as("total_players"),
    ])
    .executeTakeFirstOrThrow();

  return {
    totalPlayers: Number(row.total_players),
    gamesPlayed: Number(row.games_played),
    totalEvents: Number(row.total_events),
  };
}
