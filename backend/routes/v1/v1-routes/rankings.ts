import { Context } from "koa";
import { mostRecentSnapshot } from "../../../logic/most-recent-snapshot";

export const rankingsHandler = async (ctx: Context) => {
  const snapshot = await mostRecentSnapshot(ctx.state.db);
  const snapshotId = snapshot.id;

  const rankings = await ctx.state.db
    .selectFrom("ranking_snapshot")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .where("batch_id", "=", snapshotId)
    .selectAll()
    .orderBy("rank", "asc")
    .execute();

  ctx.body = rankings;
};
