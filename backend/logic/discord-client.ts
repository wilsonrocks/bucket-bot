import { Client, GatewayIntentBits } from "discord.js";

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // REQUIRED
  ],
});
discordClient.login(process.env.DISCORD_BOT_TOKEN);

export const RANKING_REPORTER_ROLE_ID = "1449009972339015862";
export const UK_MALIFAUX_SERVER_ID = "820257369379962881";
