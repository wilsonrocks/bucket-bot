import { Context } from "koa";
import {
  UK_MALIFAUX_SERVER_ID,
  discordClient,
} from "../../../logic/discord-client";
import { z } from "zod";
import { sql } from "kysely";

export const fetchAndStoreDiscordUserIds = async (ctx: Context) => {
  const guildId = UK_MALIFAUX_SERVER_ID;
  const guild = await discordClient.guilds.fetch(guildId);

  const members = await guild.members.fetch();

  const mappedMembers = members.map((m) => ({
    discord_user_id: m.user.id,
    discord_username: m.user.username,
    discord_display_name: m.displayName,
    discord_nickname: m.nickname,
    discord_avatar_url: m.displayAvatarURL(),
  }));

  const upserted = await ctx.state.db
    .insertInto("discord_user")
    .values(mappedMembers)
    .onConflict((oc) =>
      oc.column("discord_user_id").doUpdateSet((eb) => ({
        discord_username: eb.ref("excluded.discord_username"),
        discord_display_name: eb.ref("excluded.discord_display_name"),
        discord_avatar_url: eb.ref("excluded.discord_avatar_url"),
        discord_nickname: eb.ref("excluded.discord_nickname"),
      }))
    )
    .returningAll()
    .execute();

  ctx.response.body = { updated: upserted.length };
};

export const searchDiscordUsersByName = async (ctx: Context) => {
  const { text } = ctx.query;
  if (typeof text !== "string" || text.trim() === "") {
    ctx.status = 400;
    return ctx.throw(400, "Invalid or missing 'text' query parameter");
  }

  const candidates = await ctx.state.db
    .selectFrom("discord_user")
    .selectAll()
    .where(
      sql<boolean>`discord_username % ${text} OR discord_display_name % ${text} OR discord_nickname % ${text}`
    )
    .orderBy(
      sql<number>`GREATEST(
      similarity(discord_username, ${text}),
      similarity(discord_display_name, ${text}),
      similarity(discord_nickname, ${text})
    )`,
      "desc"
    )
    .execute();

  ctx.response.body = candidates;
};
