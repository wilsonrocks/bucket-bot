import { Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";
import {
  getRankingTypeWhereSql,
  shouldGenerateRankings,
} from "./ranking-type-logic";

export interface GenerateRankingsConfig {
  playersNeededToBeMastersRanked: number;
  numberOfTourneysToConsider: number;
}

export const generateRankings = async (
  db: Kysely<DB>,
  rankingsType: string, // don't need to narrow type as checking at runtime and this might come from DB
  config: GenerateRankingsConfig = {
    playersNeededToBeMastersRanked: 12,
    numberOfTourneysToConsider: 5,
  }
) => {
  if (!(await shouldGenerateRankings(rankingsType, db))) return;
  const rankingTypeWhereSql = getRankingTypeWhereSql(
    rankingsType,
    config.playersNeededToBeMastersRanked
  );

  if (!rankingTypeWhereSql) {
    throw new Error(`No where SQL found for rankings type: ${rankingsType}`);
  }

  await db.transaction().execute(async (trx) => {
    const batch = await trx
      .insertInto("ranking_snapshot_batch")
      .values({
        type_code: rankingsType,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const insertQuery = trx
      .insertInto("ranking_snapshot")
      .columns(["batch_id", "player_id", "rank", "total_points"])
      .expression(
        trx
          .selectFrom(
            trx
              .selectFrom("player")
              .innerJoin("result", "player.id", "result.player_id")
              .innerJoin("tourney", "result.tourney_id", "tourney.id")
              .innerJoin("faction", "result.faction_code", "faction.name_code")
              .select([
                sql.lit<number>(batch.id).as("batch_id"),
                "player.id as id",
                "player.name as name",
                "result.points as points",
                sql<number>`
                  row_number() over (
                    partition by result.player_id
                    order by result.points desc
                )
                `.as("rn"),
              ])
              .where((eb) => eb.and(rankingTypeWhereSql.map((fn) => fn(eb))))
              .as("ranked_results")
          )
          .select([
            "batch_id",
            "id",
            sql<number>`RANK() over (order by sum(points) desc)`.as("rank"),
            sql<number>`sum(points)`.as("best_tourneys_points"),
          ])
          .where("rn", "<=", config.numberOfTourneysToConsider)
          .groupBy("id")
          .groupBy("name")
          .groupBy("batch_id")
          .orderBy("best_tourneys_points", "desc")
      )
      .returningAll();

    return insertQuery.execute();
  });

  // Logic to generate rankings from the database
};
