import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql, type Kysely } from "kysely";
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

const PlayerListItemSchema = PlayerSchema.extend({
  current_team_name: z.string().nullable(),
  current_team_id: z.number().nullable(),
  event_count: z.number(),
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
      content: { "application/json": { schema: z.array(PlayerListItemSchema) } },
      description: "List of all players",
    },
  },
});

export const getPlayers: RouteHandler<typeof getPlayersRoute, AppEnv> = async (
  c,
) => {
  const db = c.get("db");
  const players = await db
    .selectFrom("player")
    .leftJoin(
      "discord_user",
      "discord_user.discord_user_id",
      "player.discord_id",
    )
    .leftJoin("membership as current_m", (join) =>
      join
        .onRef("current_m.player_id", "=", "player.id")
        .on("current_m.left_date", "is", null),
    )
    .leftJoin("team as current_team", "current_team.id", "current_m.team_id")
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
      "current_team.name as current_team_name",
      "current_team.id as current_team_id",
      (eb) =>
        eb
          .selectFrom("result")
          .innerJoin(
            "player_identity",
            "player_identity.id",
            "result.player_identity_id",
          )
          .whereRef("player_identity.player_id", "=", "player.id")
          .select((eb2) => eb2.fn.countAll<number>().as("count"))
          .as("event_count"),
    ])
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

const PlayerTeamMembershipSchema = z.object({
  membership_id: z.number(),
  team_id: z.number(),
  team_name: z.string(),
  join_date: z.string().nullable(),
  left_date: z.string().nullable(),
  is_captain: z.boolean(),
});

export const getPlayerTeamsRoute = createRoute({
  method: "get",
  path: "/player/{id}/teams",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(PlayerTeamMembershipSchema) },
      },
      description: "Team membership history for a player",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid player ID",
    },
  },
});

export const getPlayerTeams: RouteHandler<
  typeof getPlayerTeamsRoute,
  AppEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const playerId = Number(id);
  if (isNaN(playerId)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const memberships = await c
    .get("db")
    .selectFrom("membership")
    .innerJoin("team", "team.id", "membership.team_id")
    .select([
      "membership.id as membership_id",
      "team.id as team_id",
      "team.name as team_name",
      "membership.join_date",
      "membership.left_date",
      "membership.is_captain",
    ])
    .where("membership.player_id", "=", playerId)
    .orderBy("membership.join_date", "desc")
    .execute();

  return c.json(memberships as any, 200);
};

const PlayerPaintingWinSchema = z.object({
  id: z.number(),
  tourneyId: z.number(),
  tourneyName: z.string(),
  tourneyDate: z.string().nullable(),
  categoryId: z.number(),
  categoryName: z.string(),
  position: z.number(),
  totalWinners: z.number(),
  model: z.string().nullable(),
  description: z.string().nullable(),
  imageKey: z.string().nullable(),
});

export const getPlayerPaintingWinsRoute = createRoute({
  method: "get",
  path: "/player/{id}/painting-wins",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(PlayerPaintingWinSchema) },
      },
      description: "Best-painted wins for a player",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid player ID",
    },
  },
});

export const getPlayerPaintingWins: RouteHandler<
  typeof getPlayerPaintingWinsRoute,
  AppEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const playerId = Number(id);
  if (isNaN(playerId)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const db = c.get("db");

  const wins = await db
    .selectFrom("painting_winner")
    .innerJoin(
      "painting_category",
      "painting_winner.category_id" as any,
      "painting_category.id",
    )
    .innerJoin("tourney", "painting_category.tourney_id", "tourney.id")
    .innerJoin(
      "player_identity",
      "painting_winner.player_identity_id" as any,
      "player_identity.id",
    )
    .where("player_identity.player_id", "=", playerId)
    .select([
      "painting_winner.id as id",
      "tourney.id as tourneyId",
      "tourney.name as tourneyName",
      "tourney.date as tourneyDate",
      "painting_category.id as categoryId",
      "painting_category.name as categoryName",
      "painting_winner.position",
      "painting_winner.model",
      "painting_winner.image_key as imageKey" as any,
      "painting_winner.description" as any,
    ])
    .orderBy("tourney.date", "desc")
    .orderBy("painting_winner.position", "asc")
    .execute();

  if (wins.length === 0) return c.json([], 200);

  const categoryIds = Array.from(
    new Set((wins as any[]).map((w) => w.categoryId)),
  );
  const totals = await db
    .selectFrom("painting_winner")
    .where("painting_winner.category_id" as any, "in", categoryIds)
    .select([
      "painting_winner.category_id as categoryId" as any,
      sql<number>`count(*)::int`.as("totalWinners"),
    ])
    .groupBy("painting_winner.category_id" as any)
    .execute();

  const totalsByCat = new Map<number, number>(
    (totals as any[]).map((t) => [t.categoryId, t.totalWinners]),
  );

  const result = (wins as any[]).map((w) => ({
    ...w,
    totalWinners: totalsByCat.get(w.categoryId) ?? 1,
  }));

  return c.json(result as any, 200);
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
