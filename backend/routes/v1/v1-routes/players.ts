import { Context } from "koa";

export const getPlayers = async (ctx: Context) => {
  const players = await ctx.state.db
    .selectFrom("player")
    .orderBy("name")
    .selectAll()
    .execute();

  ctx.response.body = players;
};

export const getPlayerById = async (ctx: Context) => {
  const playerId = Number(ctx.params.id);
  if (!playerId || isNaN(playerId)) {
    ctx.throw(400, "Invalid player ID");
  }

  const player = await ctx.state.db
    .selectFrom("player")
    .where("id", "=", playerId)
    .selectAll()
    .executeTakeFirst();

  if (!player) {
    ctx.throw(404, "Player not found");
  }

  ctx.response.body = player;
};
