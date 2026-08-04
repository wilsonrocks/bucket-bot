import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";
import { syncDiscordUsers } from "../../../logic/discord/sync-discord-users.js";
import { runManualStep } from "../../../logic/pipeline/run-step.js";
import { attachDiscordUserToPlayer } from "../../../logic/identities/merge-player.js";
import { isRankingReporter } from "../permissions.js";

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
  const updated = await runManualStep(c.get("db"), "fetch-discord", (db) => syncDiscordUsers(db));
  return c.json({ updated }, 200);
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
    const identity = await trx
      .selectFrom("player_identity")
      .where("id", "=", playerIdentityId)
      .select("player_id")
      .executeTakeFirstOrThrow();

    await attachDiscordUserToPlayer(trx, identity.player_id!, discordUser);
  });

  return c.json({ message: "Player matched to Discord user successfully" }, 200);
};

const MatchPlayerToDiscordBodySchema = z.object({
  discordUserId: z.string().min(1),
});

export const matchPlayerIdToDiscordUserRoute = createRoute({
  method: "post",
  path: "/player/{id}/match-discord-user",
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      content: { "application/json": { schema: MatchPlayerToDiscordBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), playerId: z.number() }),
        },
      },
      description: "Player matched to Discord user",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Player already linked to a Discord user",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Player or Discord user not found",
    },
  },
});

export const matchPlayerIdToDiscordUser: RouteHandler<typeof matchPlayerIdToDiscordUserRoute, AppEnv> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const { discordUserId } = c.req.valid("json");

  const db = c.get("db");

  const player = await db
    .selectFrom("player")
    .where("id", "=", id)
    .select(["id", "discord_id"])
    .executeTakeFirst();

  if (!player) {
    return c.json({ error: "Player not found" }, 404);
  }

  if (player.discord_id) {
    return c.json({ error: "Player is already linked to a Discord user" }, 400);
  }

  const discordUser = await db
    .selectFrom("discord_user")
    .where("discord_user.discord_user_id", "=", discordUserId)
    .selectAll()
    .executeTakeFirst();

  if (!discordUser) {
    return c.json({ error: "Discord user not found" }, 404);
  }

  const survivingPlayerId = await db
    .transaction()
    .execute((trx) => attachDiscordUserToPlayer(trx, id, discordUser));

  return c.json(
    { message: "Player matched to Discord user successfully", playerId: survivingPlayerId },
    200,
  );
};
