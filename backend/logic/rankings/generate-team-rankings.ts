import { Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";
import {
  getRankingTypeWhereSql,
  shouldGenerateRankings,
} from "./ranking-type-logic";

export interface GenerateTeamRankingsConfig {
  playersNeededToBeMastersRanked: number;
  numberOfTourneysToConsider: number;
  topPlayersPerTeam: number;
}

export const generateTeamRankings = async (
  db: Kysely<DB>,
  rankingsType: string,
  config: GenerateTeamRankingsConfig = {
    playersNeededToBeMastersRanked: 8,
    numberOfTourneysToConsider: 5,
    topPlayersPerTeam: 5,
  },
) => {
  if (!(await shouldGenerateRankings(rankingsType, db))) return;
  const rankingTypeWhereSql = getRankingTypeWhereSql(
    rankingsType,
    config.playersNeededToBeMastersRanked,
  );

  if (!rankingTypeWhereSql) {
    throw new Error(`No where SQL found for rankings type: ${rankingsType}`);
  }

  await db.transaction().execute(async (trx) => {
    const batch = await trx
      .insertInto("team_ranking_snapshot_batch")
      .values({ type_code: rankingsType })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Layer 1: all qualifying results joined to historical team membership
    // Row-numbered per (team, player) so we can cap to player's top N per team
    const resultsPerTeamPlayer = trx
      .selectFrom("player")
      .innerJoin("player_identity", "player.id", "player_identity.player_id")
      .innerJoin("result", "player_identity.id", "result.player_identity_id")
      .innerJoin("tourney", "result.tourney_id", "tourney.id")
      .innerJoin("faction", "result.faction_code", "faction.name_code")
      .innerJoin("membership", "membership.player_id", "player.id")
      .select([
        "membership.team_id as team_id",
        "player.id as player_id",
        "result.points as points",
        sql<number>`
          row_number() over (
            partition by membership.team_id, player.id
            order by result.points desc
          )
        `.as("rn"),
      ])
      .where((eb) => eb.and(rankingTypeWhereSql.map((fn) => fn(eb))))
      .where((eb) => eb("tourney.date", ">=", eb.ref("membership.join_date")))
      .where((eb) =>
        eb.or([
          eb("membership.left_date", "is", null),
          eb("tourney.date", "<", eb.ref("membership.left_date")),
        ]),
      )
      .as("results_per_team_player");

    // Layer 2: cap to player's top N per team, sum to get player contribution,
    // then row-number players per team so we can cap to top N players
    const playerContributions = trx
      .selectFrom(resultsPerTeamPlayer)
      .select([
        "team_id",
        "player_id",
        sql<number>`sum(points)`.as("player_contribution"),
        sql<number>`count(*)`.as("events_for_player"),
        sql<number>`
          row_number() over (
            partition by team_id
            order by sum(points) desc
          )
        `.as("player_rn"),
      ])
      .where("rn", "<=", config.numberOfTourneysToConsider)
      .groupBy(["team_id", "player_id"])
      .as("player_contributions");

    // Layer 3: cap to top N players per team, sum to get team score, rank teams
    const insertTeamRankingsQuery = trx
      .insertInto("team_ranking_snapshot")
      .columns(["batch_id", "team_id", "rank", "total_points", "player_count", "event_count"])
      .expression(
        trx
          .selectFrom(playerContributions)
          .select([
            sql.lit<number>(batch.id).as("batch_id"),
            "team_id",
            sql<number>`rank() over (order by sum(player_contribution) desc)`.as("rank"),
            sql<number>`sum(player_contribution)`.as("total_points"),
            sql<number>`count(*)`.as("player_count"),
            sql<number>`sum(events_for_player)`.as("event_count"),
          ])
          .where("player_rn", "<=", config.topPlayersPerTeam)
          .groupBy("team_id"),
      )
      .returningAll();

    await insertTeamRankingsQuery.execute();

    await sql`
      UPDATE team_ranking_snapshot trs
      SET rank_change = prev.rank - trs.rank
      FROM team_ranking_snapshot prev
      INNER JOIN team_ranking_snapshot_batch prev_b ON prev.batch_id = prev_b.id
      WHERE trs.batch_id = ${batch.id}
        AND prev_b.id = (
          SELECT MAX(id) FROM team_ranking_snapshot_batch
          WHERE type_code = ${rankingsType} AND id < ${batch.id}
        )
        AND prev.team_id = trs.team_id
    `.execute(trx);

    await sql`
      UPDATE team_ranking_snapshot trs
      SET new_team = NOT EXISTS (
        SELECT 1 FROM team_ranking_snapshot prior
        INNER JOIN team_ranking_snapshot_batch prior_b ON prior.batch_id = prior_b.id
        WHERE prior.team_id = trs.team_id
          AND prior_b.type_code = ${rankingsType}
          AND prior.batch_id < ${batch.id}
      )
      WHERE trs.batch_id = ${batch.id}
    `.execute(trx);
  });
};
