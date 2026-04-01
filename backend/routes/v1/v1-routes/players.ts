import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import type { AppEnv } from "../../../hono-env.js";
import { isRankingReporter } from "../permissions.js";

const PlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string().nullable(),
  discord_id: z.string().nullable(),
  discord_username: z.string().nullable(),
  discord_display_name: z.string().nullable(),
  discord_avatar_url: z.string().nullable(),
  longshanks_id: z.string().nullable(),
  longshanks_name: z.string().nullable(),
  created_at: z.string().nullable(),
});

const ErrorSchema = z.object({ error: z.string() });

function playerWithDiscordQuery(db: Kysely<DB>) {
  return db
    .selectFrom("player")
    .leftJoin(
      "discord_user",
      "discord_user.discord_user_id",
      "player.discord_id",
    )
    .select([
      "player.id",
      "player.name",
      "player.short_name",
      "player.discord_id",
      "player.longshanks_name",
      "player.created_at",
      "discord_user.discord_username",
      "discord_user.discord_display_name",
      "discord_user.discord_avatar_url",
    ]);
}

export const getPlayersRoute = createRoute({
  method: "get",
  path: "/players",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PlayerSchema) } },
      description: "List of all players",
    },
  },
});

export const getPlayers: RouteHandler<typeof getPlayersRoute, AppEnv> = async (
  c,
) => {
  const players = await playerWithDiscordQuery(c.get("db"))
    .orderBy("player.name")
    .execute();
  return c.json(players as any, 200);
};

export const getPlayerByIdRoute = createRoute({
  method: "get",
  path: "/player/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: PlayerSchema } },
      description: "Player details",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid player ID",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Player not found",
    },
  },
});

export const getPlayerById: RouteHandler<
  typeof getPlayerByIdRoute,
  AppEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const playerId = Number(id);
  if (isNaN(playerId)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const player = await playerWithDiscordQuery(c.get("db"))
    .where("player.id", "=", playerId)
    .executeTakeFirst();

  if (!player) {
    return c.json({ error: "Player not found" }, 404);
  }

  return c.json(player as any, 200);
};

const UpdatePlayerBodySchema = z.object({
  name: z.string(),
  short_name: z.string().nullable().optional(),
});

export const updatePlayerRoute = createRoute({
  method: "put",
  path: "/player/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: UpdatePlayerBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PlayerSchema } },
      description: "Player updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid player ID",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Player not found",
    },
  },
});

// ── GET /player-name-exists ────────────────────────────────────────────────

const PlayerNameExistsQuerySchema = z
  .object({
    name: z.string().optional(),
    short_name: z.string().optional(),
  })
  .refine(
    (data) => (data.name !== undefined) !== (data.short_name !== undefined),
    { message: "Exactly one of 'name' or 'short_name' must be provided" },
  );

export const playerNameExistsRoute = createRoute({
  method: "get",
  path: "/player-name-exists/{player_id}",
  request: {
    params: z.object({ player_id: z.string() }),
    query: PlayerNameExistsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ exists: z.boolean() }) },
      },
      description: "Name existence check",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

export const playerNameExistsHandler: RouteHandler<
  typeof playerNameExistsRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { player_id } = c.req.valid("param");
  const playerId = Number(player_id);
  const { name, short_name } = c.req.valid("query");
  const db = c.get("db");

  let query = db
    .selectFrom("player")
    .select("player.id")
    .where("player.id", "!=", playerId);

  if (name !== undefined) {
    query = query.where("player.name", "=", name);
  } else {
    query = query.where("player.short_name", "=", short_name!);
  }

  const result = await query.executeTakeFirst();
  return c.json({ exists: result !== undefined }, 200);
};

// ── PUT /player/{id} ───────────────────────────────────────────────────────

export const updatePlayer: RouteHandler<
  typeof updatePlayerRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const playerId = Number(id);
  if (isNaN(playerId)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const { name, short_name } = c.req.valid("json");

  const updated = await c
    .get("db")
    .updateTable("player")
    .set({ name, ...(short_name !== undefined ? { short_name } : {}) })
    .where("id", "=", playerId)
    .executeTakeFirst();

  if (!updated.numUpdatedRows || updated.numUpdatedRows === BigInt(0)) {
    return c.json({ error: "Player not found" }, 404);
  }

  const player = await playerWithDiscordQuery(c.get("db"))
    .where("player.id", "=", playerId)
    .executeTakeFirst();

  return c.json(player as any, 200);
};
