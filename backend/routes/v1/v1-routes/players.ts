import { Context } from "koa";

export const getPlayers = async (ctx: Context) => {
  const players = await ctx.state.db
    .selectFrom("player")
    .orderBy("name")
    .selectAll()
    .execute();

  ctx.response.body = players;
};
