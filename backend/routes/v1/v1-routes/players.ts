import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const PlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  discord_id: z.string().nullable(),
  discord_username: z.string().nullable(),
  longshanks_id: z.string().nullable(),
  longshanks_name: z.string().nullable(),
  created_at: z.string().nullable(),
});

const ErrorSchema = z.object({ error: z.string() });

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

export const getPlayers: RouteHandler<typeof getPlayersRoute, AppEnv> = async (c) => {
  const players = await c.get("db").selectFrom("player").orderBy("name").selectAll().execute();
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

export const getPlayerById: RouteHandler<typeof getPlayerByIdRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const playerId = Number(id);
  if (isNaN(playerId)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const player = await c.get("db")
    .selectFrom("player")
    .where("id", "=", playerId)
    .selectAll()
    .executeTakeFirst();

  if (!player) {
    return c.json({ error: "Player not found" }, 404);
  }

  return c.json(player as any, 200);
};
