import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env";
import { announceNextPlayer } from "../../../logic/achievements/announce";
import { syncAchievements } from "../../../logic/achievements/sync-achievements";
import { runManualStep } from "../../../logic/pipeline/run-step";
import { isRankingReporter } from "../permissions";

const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  flavour_text: z.string(),
  flavour_source: z.string().nullable(),
  image_key: z.string().nullable(),
  display_order: z.number(),
  award_count: z.number(),
  unannounced_count: z.number(),
});

const ErrorSchema = z.object({ error: z.string() });

export const getAchievementsRoute = createRoute({
  method: "get",
  path: "/achievements",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(AchievementSchema) } },
      description: "All achievements with award counts",
    },
  },
});

export const getAchievementsHandler: RouteHandler<
  typeof getAchievementsRoute,
  AppEnv
> = async (c) => {
  const achievements = await c
    .get("db")
    .selectFrom("achievement")
    .leftJoin(
      "player_achievement",
      "player_achievement.achievement_id",
      "achievement.id",
    )
    .groupBy("achievement.id")
    .select((eb) => [
      "achievement.id",
      "achievement.name",
      "achievement.flavour_text",
      "achievement.flavour_source",
      "achievement.image_key",
      "achievement.display_order",
      eb.fn.count<string>("player_achievement.player_id").as("award_count"),
      eb.fn
        .count<string>("player_achievement.player_id")
        .filterWhere("player_achievement.discord_message_id", "is", null)
        .as("unannounced_count"),
    ])
    .orderBy("achievement.display_order")
    .execute();

  return c.json(
    achievements.map((a) => ({
      ...a,
      award_count: Number(a.award_count),
      unannounced_count: Number(a.unannounced_count),
    })),
    200,
  );
};

const UpdateAchievementBodySchema = z.object({
  name: z.string().trim().min(1),
  flavour_text: z.string().trim().min(1),
  flavour_source: z.string().trim().nullable(),
  image_key: z.string().nullable(),
});

export const updateAchievementRoute = createRoute({
  method: "put",
  path: "/achievements/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: UpdateAchievementBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Achievement updated",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Achievement not found",
    },
  },
});

export const updateAchievementHandler: RouteHandler<
  typeof updateAchievementRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const { name, flavour_text, flavour_source, image_key } = c.req.valid("json");

  const updated = await c
    .get("db")
    .updateTable("achievement")
    .set({
      name,
      flavour_text,
      flavour_source: flavour_source || null,
      image_key,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();

  if (!updated) {
    return c.json({ error: "Achievement not found" }, 404);
  }

  return c.json({ message: "Achievement updated" }, 200);
};

export const syncAchievementsRoute = createRoute({
  method: "post",
  path: "/achievements/sync",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            inserted: z.number(),
            updated: z.number(),
            deleted: z.number(),
          }),
        },
      },
      description: "Achievements recalculated from current results",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

export const syncAchievementsHandler: RouteHandler<
  typeof syncAchievementsRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await runManualStep(c.get("db"), "sync-achievements", (db) =>
    syncAchievements(db),
  );
  return c.json(result, 200);
};

export const announceAchievementsRoute = createRoute({
  method: "post",
  path: "/achievements/announce-next",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ playerId: z.number().nullable() }),
        },
      },
      description:
        "Announced the longest-waiting player's achievements (playerId null if none were pending)",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

/** Manual announcements deliberately ignore UK working hours. */
export const announceAchievementsHandler: RouteHandler<
  typeof announceAchievementsRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const playerId = await runManualStep(
    c.get("db"),
    "announce-achievements",
    (db) => announceNextPlayer(db),
  );
  return c.json({ playerId }, 200);
};
