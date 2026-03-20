import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";
import { UK_MALIFAUX_SERVER_ID, getDiscordClient } from "../../../logic/discord-client.js";

const ErrorSchema = z.object({ error: z.string() });

const DiscordUserSchema = z.object({
  discord_user_id: z.string(),
  discord_username: z.string().nullable(),
  discord_display_name: z.string().nullable(),
  discord_nickname: z.string().nullable(),
  discord_avatar_url: z.string().nullable(),
}).passthrough();

export const fetchDiscordUserIdsRoute = createRoute({
  method: "post",
  path: "/fetch-discord-user-ids",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ updated: z.number() }) } },
      description: "Discord users synced",
    },
  },
});

export const fetchAndStoreDiscordUserIds: RouteHandler<typeof fetchDiscordUserIdsRoute, AppEnv> = async (c) => {
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

  const upserted = await c.get("db")
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

  return c.json({ updated: upserted.length }, 200);
};

export const getAllDiscordUsersRoute = createRoute({
  method: "get",
  path: "/all-discord-users",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(DiscordUserSchema) } },
      description: "All Discord users",
    },
  },
});

export const getAllDiscordUsers: RouteHandler<typeof getAllDiscordUsersRoute, AppEnv> = async (c) => {
  const users = await c.get("db")
    .selectFrom("discord_user")
    .leftJoin("player", "player.discord_id", "discord_user.discord_user_id")
    .selectAll()
    .orderBy("discord_username", "asc")
    .execute();

  return c.json(users as any, 200);
};

export const searchDiscordUsersRoute = createRoute({
  method: "get",
  path: "/search-discord-users",
  request: {
    query: z.object({ text: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(DiscordUserSchema) } },
      description: "Matching Discord users",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing search text",
    },
  },
});

export const searchDiscordUsersByName: RouteHandler<typeof searchDiscordUsersRoute, AppEnv> = async (c) => {
  const { text } = c.req.valid("query");

  if (text.trim() === "") {
    return c.json({ error: "Invalid or missing 'text' query parameter" }, 400);
  }

  const candidates = await c.get("db")
    .selectFrom("discord_user")
    .selectAll()
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

  return c.json(candidates as any, 200);
};

const MatchPlayerBodySchema = z.object({
  playerIdentityId: z.number().int().positive(),
  discordUserId: z.string().min(1),
});

export const matchPlayerToDiscordUserRoute = createRoute({
  method: "post",
  path: "/match-player-to-discord-user",
  request: {
    body: {
      content: { "application/json": { schema: MatchPlayerBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Player matched to Discord user",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Discord user not found",
    },
  },
});

export const matchPlayerToDiscordUser: RouteHandler<typeof matchPlayerToDiscordUserRoute, AppEnv> = async (c) => {
  const { playerIdentityId, discordUserId } = c.req.valid("json");

  const db = c.get("db");

  const discordUser = await db
    .selectFrom("discord_user")
    .where("discord_user.discord_user_id", "=", discordUserId)
    .selectAll()
    .executeTakeFirst();

  if (!discordUser) {
    return c.json({ error: "Discord user not found" }, 404);
  }

  await db.transaction().execute(async (trx) => {
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

    await trx
      .updateTable("player_identity")
      .set({ player_id: player.id })
      .where("id", "=", playerIdentityId)
      .executeTakeFirst();
  });

  return c.json({ message: "Player matched to Discord user successfully" }, 200);
};
