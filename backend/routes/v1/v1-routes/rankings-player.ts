import { Context } from "koa";

export const rankingsPlayerHandler = async (ctx: Context) => {
  const { playerId, typeCode } = ctx.params;

  if (!playerId) {
    return ctx.throw(400, "Player ID is required");
  }

  if (!typeCode) {
    return ctx.throw(400, "Type code is required");
  }

  const rankings = await ctx.state.db
    .selectFrom("ranking_snapshot")

    .where("player_id", "=", playerId)
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id"
    )
    .where("ranking_snapshot_batch.type_code", "=", typeCode)
    .select([
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.created_at",
      "ranking_snapshot.rank",
      "ranking_snapshot.total_points",
      "player.name",
    ])
    .execute();

  ctx.body = rankings;
};
