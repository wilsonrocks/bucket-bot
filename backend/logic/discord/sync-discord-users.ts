import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { UK_MALIFAUX_SERVER_ID, getDiscordClient } from "../discord-client.js";

/**
 * Fetches all members of the UK Malifaux Discord server and upserts them into
 * the discord_user table. Returns the number of rows upserted. Discord rate
 * limits how often the member list can be fetched, so this should not run too
 * frequently.
 */
export async function syncDiscordUsers(db: Kysely<DB>): Promise<number> {
  const discordClient = await getDiscordClient();
  const guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);
  const members = await guild.members.fetch();

  const mappedMembers = members.map((m) => ({
    discord_user_id: m.user.id,
    discord_username: m.user.username,
    discord_display_name: m.displayName,
    discord_nickname: m.nickname,
    discord_avatar_url: m.displayAvatarURL(),
  }));

  const upserted = await db
    .insertInto("discord_user")
    .values(mappedMembers)
    .onConflict((oc) =>
      oc.column("discord_user_id").doUpdateSet((eb) => ({
        discord_username: eb.ref("excluded.discord_username"),
        discord_display_name: eb.ref("excluded.discord_display_name"),
        discord_avatar_url: eb.ref("excluded.discord_avatar_url"),
        discord_nickname: eb.ref("excluded.discord_nickname"),
      })),
    )
    .returningAll()
    .execute();

  return upserted.length;
}
