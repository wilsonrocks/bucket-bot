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

  const members = await guild.members.fetch(); // TODO this is expensive and harshly rate limited

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
    .leftJoin("player", "discord_user.discord_user_id", "player.discord_id")
    .where("player.id", "is", null) // Exclude already linked users
    .where(
      sql<boolean>`discord_user.discord_username % ${text} OR discord_display_name % ${text} OR discord_nickname % ${text}`
    )
    .orderBy(
      sql<number>`GREATEST(
      similarity(discord_user.discord_username, ${text}),
      similarity(discord_display_name, ${text}),
      similarity(discord_nickname, ${text})
    )`,
      "desc"
    )
    .execute();

  ctx.response.body = candidates;
};

export const playersWithNoDiscordId = async (ctx: Context) => {
  const players = await ctx.state.db
    .selectFrom("player")
    .innerJoin("result", "player.id", "result.player_id")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("discord_id", "is", null)
    .select([
      "player.id as player_id",
      "player.name as player_name",
      "player.longshanks_name",
      "player.longshanks_id",
      "tourney.name as tourney_name",
      "result.place",
      "faction.name as faction_name",
    ])
    .orderBy("player.id", "asc")
    .execute();

  // Group by player_id
  const grouped = new Map();
  for (const row of players) {
    if (!grouped.has(row.player_id)) {
      grouped.set(row.player_id, {
        player_id: row.player_id,
        player_name: row.player_name,
        longshanks_name: row.longshanks_name,
        longshanks_id: row.longshanks_id,
        results: [],
      });
    }
    grouped.get(row.player_id).results.push({
      tourney_name: row.tourney_name,
      place: row.place,
      faction: row.faction_name,
    });
  }

  ctx.response.body = Array.from(grouped.values());
};

export const matchPlayerToDiscordUser = async (ctx: Context) => {
  const { playerId, discordUserId } = ctx.params;

  // Validate playerId and discordUserId
  if (!playerId || isNaN(Number(playerId))) {
    ctx.status = 400;
    return ctx.throw(400, "Invalid or missing 'playerId' parameter");
  }
  if (!discordUserId || typeof discordUserId !== "string") {
    ctx.status = 400;
    return ctx.throw(400, "Invalid or missing 'discordUserId' parameter");
  }

  try {
    await Promise.all([
      ctx.state.db
        .selectFrom("player")
        .where("id", "=", Number(playerId))
        .executeTakeFirstOrThrow(),
      ctx.state.db
        .selectFrom("discord_user")
        .where("discord_user_id", "=", discordUserId)
        .executeTakeFirstOrThrow(),
    ]);
  } catch (err) {
    console.error(err);
    throw ctx.throw(404, `Player or Discord user not found ${err}`);
  }

  await ctx.state.db
    .updateTable("player")
    .set({ discord_id: discordUserId })
    .where("id", "=", playerId)
    .execute();

  ctx.response.body = {
    message: "Player matched to Discord user successfully",
  };
};
