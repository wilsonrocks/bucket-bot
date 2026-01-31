import { Context } from "koa";

export const getUnmappedIdentities = async (ctx: Context) => {
  const unmappedPlayers = await ctx.state.db
    .selectFrom("player_identity")
    .where("player_id", "is", null)
    .selectAll()
    .execute();
  ctx.response.body = unmappedPlayers;
};
