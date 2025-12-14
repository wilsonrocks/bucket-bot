import { Client, GatewayIntentBits } from "discord.js";
import { Context } from "koa";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // REQUIRED
  ],
});
client.login(process.env.DISCORD_BOT_TOKEN);

const RANKING_REPORTER_ROLE_ID = "1449009972339015862";
const UK_MALIFAUX_SERVER_ID = "820257369379962881";

export const hasRankingReporterRole = async (ctx: Context) => {
  const userId = ctx.request.query.userId;
  console.log({ userId, type: typeof userId });

  if (typeof userId !== "string") {
    return ctx.throw(400, "Missing userId");
  }

  let guild;

  try {
    guild = await client.guilds.fetch(UK_MALIFAUX_SERVER_ID);
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
