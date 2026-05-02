import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";

const RecentPaintingWinnerSchema = z.object({
  playerId: z.number().nullable(),
  playerName: z.string(),
  tourneyId: z.number(),
  tourneyName: z.string(),
  categoryName: z.string(),
  imageKey: z.string().nullable(),
  model: z.string().nullable(),
});

export const recentPaintingWinnerRoute = createRoute({
  method: "get",
  path: "/painting/recent",
  responses: {
    200: {
      content: {
        "application/json": { schema: RecentPaintingWinnerSchema },
      },
      description: "Most recent painting prize winner (position 1, first category of latest event with painting winners)",
    },
    404: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "No painting winners found",
    },
  },
});

export const recentPaintingWinnerHandler: RouteHandler<
  typeof recentPaintingWinnerRoute,
  AppEnv
> = async (c) => {
  const db = c.get("db");

  const row = await db
    .selectFrom("painting_winner")
    .innerJoin("painting_category", "painting_winner.category_id", "painting_category.id")
    .innerJoin("tourney", "painting_category.tourney_id", "tourney.id")
    .innerJoin("player_identity", "painting_winner.player_identity_id" as any, "player_identity.id")
    .leftJoin("player", "player_identity.player_id", "player.id")
    .where("painting_winner.position", "=", 1)
    .orderBy("tourney.date", "desc")
    .orderBy("painting_category.id", "asc")
    .select([
      "player.id as playerId",
      sql<string>`coalesce(${sql.ref("player.name")}, ${sql.ref("player_identity.provider_name")})`.as("playerName"),
      "tourney.id as tourneyId",
      "tourney.name as tourneyName",
      "painting_category.name as categoryName",
      "painting_winner.image_key as imageKey" as any,
      "painting_winner.model as model",
    ])
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return c.json({ error: "No painting winners found" }, 404);
  }

  return c.json({
    playerId: row.playerId ?? null,
    playerName: row.playerName,
    tourneyId: row.tourneyId,
    tourneyName: row.tourneyName,
    categoryName: row.categoryName,
    imageKey: (row as any).imageKey ?? null,
    model: row.model ?? null,
  } as any, 200);
};
