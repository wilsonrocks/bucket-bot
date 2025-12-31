import { Context } from "koa";
import { generateRankings } from "../../../logic/rankings/generate-rankings";

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
  const errors = donePromises.flatMap((p) =>
    p.status === "rejected" ? [p.reason] : []
  );
  if (errors.length > 0) {
    console.error(errors);
  }
  ctx.body = { rankings: [] };
};
