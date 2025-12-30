import { ExpressionBuilder, Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";

const rankingTypeWhereMap = {
  BEST_FOREVER: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(sql.lit("TRUE"), "=", sql.lit("TRUE")),
  ],
  BEST_RESSER: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", "RESSERS"),
    (eb: ExpressionBuilder<DB, "tourney">) =>
      eb("tourney.date", ">=", sql<Date>`current_date - interval '1 year'`),
  ],
} as const;

export const generateRankings = async (
  db: Kysely<DB>,
  rankingsType: string // don't need to narrow type as checking at runtime and this might come from DB
) => {
  const rankingSnapshotType = await db
    .selectFrom("ranking_snapshot_type")
    .where("code", "=", rankingsType)
    .selectAll()
    .executeTakeFirst();

  if (!rankingSnapshotType) {
    throw new Error(`Invalid rankings type: ${rankingsType}`);
  }
  const rankingTypeWhereSql =
    rankingTypeWhereMap[rankingsType as keyof typeof rankingTypeWhereMap]; // this cast is keeping TS happy, the real check happens below

  if (!rankingTypeWhereSql) {
    throw new Error(
      `No WHERE clause defined for rankings type: ${rankingsType}`
    );
  }

  await db.transaction().execute(async (trx) => {
    const batch = await trx
      .insertInto("ranking_snapshot_batch")
      .values({
        type_code: rankingSnapshotType.code,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return await trx
      .insertInto("ranking_snapshot")
      .columns(["batch_id", "player_id", "rank", "total_points"])
      .expression(
        trx
          .selectFrom(
            trx
              .selectFrom("player")
              .innerJoin("result", "player.id", "result.player_id")
              .innerJoin("tourney", "result.tourney_id", "tourney.id")
              .innerJoin("faction", "result.faction_id", "faction.id")
              .select([
                sql.lit(batch.id).as("batch_id"),
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
            sql<number>`row_number() over (order by sum(points) desc)`.as(
              "rank"
            ),
            sql<number>`sum(points)`.as("best5"),
          ])
          .where("rn", "<=", 5)
          .groupBy("id")
          .groupBy("name")
          .groupBy("batch_id")
          .orderBy("best5", "desc")
      )
      .returningAll()
      .execute();
  });

  // Logic to generate rankings from the database
};
