export const RANKING_REPORTER_ROLE_ID = "1449009972339015862";
export const EVENT_ENTHUSIAST_ROLE_ID = "1079826009727193188";
export const UK_MALIFAUX_SERVER_ID = "820257369379962881";

import { Client, GatewayIntentBits, Events } from "discord.js";

let client: Client | null = null;
let readyPromise: Promise<Client> | null = null;

export function getDiscordClient(): Promise<Client> {
  if (readyPromise) return readyPromise;

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  readyPromise = (async () => {
    await client!.login(process.env.DISCORD_BOT_TOKEN);
    await client!.once(Events.ClientReady, () => {
      console.log("Discord client is ready");
    });
    return client!;
  })();

  return readyPromise;
}
