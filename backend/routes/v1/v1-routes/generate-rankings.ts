import { Context } from "koa";
import { generateRankings } from "../../../logic/generate-rankings";

export const generateRankingsHandler = async (ctx: Context) => {
  const rankings = await ctx.state.db
    .selectFrom("ranking_snapshot_type")
    .selectAll()
    .execute();

  const donePromises = await Promise.allSettled(
    rankings.map(async (rankingType) => {
      await generateRankings(ctx.state.db, rankingType.code);
    })
  );
  console.error(
    donePromises.flatMap((p) => (p.status === "rejected" ? [p.reason] : []))
  );
  ctx.body = { rankings: [] };
};
