import { Context } from "koa";
import { generateRankings } from "../../../logic/generate-rankings";

export const generateRankingsHandler = async (ctx: Context) => {
  await generateRankings(ctx.state.db);

  ctx.body = { rankings: [] };
};
