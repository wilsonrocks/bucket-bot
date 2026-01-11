import { Context } from "koa";

export const getAllTiers = async (ctx: Context) => {
  ctx.response.body = await ctx.state.db
    .selectFrom("tier")
    .selectAll()
    .execute();
};
