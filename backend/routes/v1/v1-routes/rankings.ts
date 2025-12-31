import { Context } from "koa";
import { mostRecentSnapshot } from "../../../logic/most-recent-snapshot";

export const rankingsHandler = async (ctx: Context) => {
  const { typeCode } = ctx.params;
  const snapshot = await mostRecentSnapshot(ctx.state.db, typeCode);
  const snapshotId = snapshot.id;
  console.log({ typeCode });
  const rankings = await ctx.state.db
    .selectFrom("ranking_snapshot")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id"
    )
    .where("batch_id", "=", snapshotId)
    .where("type_code", "=", typeCode)
    .selectAll()
    .orderBy("rank", "asc")
    .execute();

  ctx.body = rankings;
};
