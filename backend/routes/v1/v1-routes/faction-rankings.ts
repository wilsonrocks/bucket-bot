import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateFactionRankings } from "../../../logic/rankings/generate-faction-rankings.js";
import { postFactionRankings } from "../../../logic/discord/post-faction-rankings.js";
import { runManualStep } from "../../../logic/pipeline/run-step.js";

const FactionRankingSchema = z.object({
  snapshot_date: z.string().nullable(),
  faction_name: z.string(),
  rank: z.number().nullable(),
  faction_code: z.string(),
  total_points: z.number().nullable(),
  declarations: z.number().nullable(),
  declaration_rate: z.number().nullable(),
  points_per_declaration: z.number().nullable(),
  hex_code: z.string(),
  rank_change: z.number().nullable(),
});


const ErrorSchema = z.object({ error: z.string() });

export const getFactionRankingsRoute = createRoute({
  method: "get",
  path: "/faction-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FactionRankingSchema) } },
      description: "Current faction rankings",
    },
  },
});

export const getFactionRankings: RouteHandler<typeof getFactionRankingsRoute, AppEnv> = async (c) => {
  const db = c.get("db");
  const newestBatch = await db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!newestBatch) {
    return c.json([], 200);
  }

  const data = await db
    .selectFrom("faction_snapshot")
    .innerJoin("faction_snapshot_batch", "faction_snapshot.batch_id", "faction_snapshot_batch.id")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction.name_code as faction_code",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.declaration_rate as declaration_rate",
      "faction_snapshot.points_per_declaration as points_per_declaration",
      "faction.hex_code as hex_code",
      "faction_snapshot.rank_change as rank_change",
    ])
    .where("faction_snapshot.batch_id", "=", newestBatch.id)
    .orderBy("rank")
    .execute();

  return c.json(data as any, 200);
};

export const generateFactionRankingsRoute = createRoute({
  method: "post",
  path: "/faction-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
      description: "Faction rankings generated",
    },
  },
});

export const generateFactionRankingsHandler: RouteHandler<typeof generateFactionRankingsRoute, AppEnv> = async (c) => {
  await runManualStep(c.get("db"), "generate-faction", (db) => generateFactionRankings(db));
  return c.json({ success: true }, 200);
};

export const postFactionRankingsRoute = createRoute({
  method: "post",
  path: "/post-faction-rankings",
  request: {
    query: z.object({ live: z.string().optional() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Faction rankings posted to Discord",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), message: z.string() }),
        },
      },
      description: "No faction snapshot available",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), message: z.string() }),
        },
      },
      description: "Discord channel error",
    },
  },
});

export const postFactionRankingsHandler: RouteHandler<typeof postFactionRankingsRoute, AppEnv> = async (c) => {
  const { live } = c.req.valid("query");
  const isLive = live !== undefined;

  await runManualStep(c.get("db"), "post-faction", (db) => postFactionRankings(db, { live: isLive }));
  return c.json({ success: true as const }, 200);
};
