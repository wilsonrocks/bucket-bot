export const RANKING_REPORTER_ROLE_ID = "1449009972339015862";
const EVENT_ENTHUSIAST_ROLE_ID = "1079826009727193188";
export const UK_MALIFAUX_SERVER_ID = "820257369379962881";

export const MENTION_EVENT_ENTHUSIAST = process.env.MENTION_FOR_REAL
  ? `<@&${EVENT_ENTHUSIAST_ROLE_ID}>`
  : `\`@Event Enthusiast\``;

export const mentionUser = ({
  discord_user_id,
  name,
}: {
  discord_user_id: string | null;
  name: string;
}) => (process.env.MENTION_FOR_REAL ? `<@${discord_user_id}>` : `\`${name}\``);

export async function mentionUserInGuild(
  guild: Guild,
  player: {
    discord_user_id: string | null;
    discord_display_name?: string | null;
    name: string;
  },
): Promise<string> {
  if (!player.discord_user_id) return player.name;
  try {
    await guild.members.fetch(player.discord_user_id);
    return `<@${player.discord_user_id}>`;
  } catch {
    return player.discord_display_name ?? player.name;
  }
}

import { Client, Guild, GatewayIntentBits, Events } from "discord.js";

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
