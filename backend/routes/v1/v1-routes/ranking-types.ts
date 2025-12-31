import { Context } from "koa";

export const rankingTypesHandler = async (ctx: Context) => {
  const rankingTypes = await ctx.state.db
    .selectFrom("ranking_snapshot_type")
    .where("display", "=", true)
    .select(["code", "name", "description"])
    .execute();
  ctx.body = rankingTypes;
};
