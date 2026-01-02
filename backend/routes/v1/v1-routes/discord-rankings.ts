import { Context } from "koa";
import { postDiscordRankings } from "../../../logic/discord/post-rankings";

export const postDiscordRankingsHandler = async (ctx: Context) => {
  await postDiscordRankings(ctx.state.db);
  ctx.response.body = { message: "Discord rankings posted successfully" };
};
