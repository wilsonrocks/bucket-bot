import { Context } from "koa";
import { sql } from "kysely";
import z from "zod";
import {
  UK_MALIFAUX_SERVER_ID,
  getDiscordClient,
} from "../../../logic/discord-client";
import { pl } from "zod/v4/locales";

export const fetchAndStoreDiscordUserIds = async (ctx: Context) => {
  const guildId = UK_MALIFAUX_SERVER_ID;
  const discordClient = await getDiscordClient();
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
      })),
    )
    .returningAll()
    .execute();

  ctx.response.body = { updated: upserted.length };
};

export const getAllDiscordUsers = async (ctx: Context) => {
  const users = await ctx.state.db
    .selectFrom("discord_user")
    .leftJoin("player", "player.discord_id", "discord_user.discord_user_id")
    .selectAll()
    .orderBy("discord_username", "asc")
    .execute();

  ctx.response.body = users;
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
    // .leftJoin("player", "discord_user.discord_user_id", "player.discord_id")
    // .where("player.id", "is", null) // Exclude already linked users
    .where(
      sql<boolean>`discord_user.discord_username % ${text} OR discord_display_name % ${text} OR discord_nickname % ${text}`,
    )
    .orderBy(
      sql<number>`GREATEST(
      similarity(discord_user.discord_username, ${text}),
      similarity(discord_display_name, ${text}),
      similarity(discord_nickname, ${text})
    )`,
      "desc",
    )
    .execute();

  ctx.response.body = candidates;
};

export const playersWithNoDiscordId = async (ctx: Context) => {
  const players = await ctx.state.db
    .selectFrom("player")
    .innerJoin("player_identity", "player.id", "player_identity.player_id")
    .innerJoin("result", "player_identity.id", "result.player_identity_id")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("discord_id", "is", null)
    .select([
      "player.id as player_id",
      "player.name as player_name",
      "player.longshanks_name",
      "player_identity.external_id as longshanks_id",
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

const matchPlayerValidator = z.object({
  playerIdentityId: z.number().int().positive(),
  discordUserId: z.string().min(1),
});

export const matchPlayerToDiscordUser = async (ctx: Context) => {
  let parsedPayload;
  try {
    parsedPayload = matchPlayerValidator.parse(ctx.request.body);
  } catch (err) {
    ctx.status = 400;
    return ctx.throw(400, "Invalid request body" + (err as any).message);
  }

  const { playerIdentityId, discordUserId } = parsedPayload;

  // Validate playerIdentityId and discordUserId

  if (!playerIdentityId || isNaN(Number(playerIdentityId))) {
    ctx.status = 400;
    return ctx.throw(400, "Invalid or missing 'playerIdentity Id' parameter");
  }
  if (!discordUserId || typeof discordUserId !== "string") {
    ctx.status = 400;
    return ctx.throw(400, "Invalid or missing 'discordUserId' parameter");
  }

  const discordUser = await ctx.state.db
    .selectFrom("discord_user")
    .where("discord_user.discord_user_id", "=", discordUserId)
    .selectAll()
    .executeTakeFirst();

  if (!discordUser) {
    ctx.status = 404;
    return ctx.throw(404, "Discord user not found");
  }

  await ctx.state.db.transaction().execute(async (trx) => {
    let player = await trx
      .selectFrom("player")
      .where("discord_id", "=", discordUserId)
      .selectAll()
      .executeTakeFirst();

    if (!player) {
      player = await trx
        .insertInto("player")
        .values({
          discord_id: discordUserId,
          name:
            discordUser.discord_display_name ||
            discordUser.discord_username ||
            discordUser.discord_nickname ||
            "Unknown User",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    // now create the mapping
    await trx
      .updateTable("player_identity")
      .set({
        player_id: player.id,
      })
      .where("id", "=", playerIdentityId)
      .executeTakeFirst();

    ctx.response.body = {
      message: "Player matched to Discord user successfully",
    };
  });
};
