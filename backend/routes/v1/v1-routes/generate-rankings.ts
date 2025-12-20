import { Context } from "koa";

export const generateRankings = (ctx: Context) => {
  ctx.body = { rankings: [] };
};
