import { Context } from "koa";
import {
  discordClient,
  RANKING_REPORTER_ROLE_ID,
  UK_MALIFAUX_SERVER_ID,
} from "../../../logic/discord-client";

export const hasRankingReporterRole = async (ctx: Context) => {
  const { id: userId } = ctx.state.user;

  if (typeof userId !== "string") {
    return ctx.throw(400, "Missing userId");
  }

  let guild;

  try {
    guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);
  } catch (err) {
    console.error(err);
    return ctx.throw(500, { cause: err });
  }

  let member;
  try {
    member = await guild.members.fetch(userId);
  } catch (err) {
    console.error(err);
    return ctx.throw(500, { cause: err });
  }

  const hasRole = member.roles.cache.has(RANKING_REPORTER_ROLE_ID);

  ctx.body = {
    rankingReporter: hasRole,
  };
};
