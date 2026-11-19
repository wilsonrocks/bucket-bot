import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env";
import {
  EDITIONS,
  generateBuried,
  generationStatus,
  s3ImageIO,
  startGeneration,
} from "../../../logic/buried";
import { sendBuriedDms, sendBuriedTestDm } from "../../../logic/buried/send-dms";
import { isRankingReporter } from "../permissions";

const ErrorSchema = z.object({ error: z.string() });
const forbidden = { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" };
const notFound = { content: { "application/json": { schema: ErrorSchema } }, description: "No such year" };
const YearParams = z.object({ year: z.string().regex(/^\d{4}$/) });

const GenerationStatusSchema = z.object({
  state: z.enum(["idle", "running", "done", "failed"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  error: z.string().optional(),
  result: z.object({ players: z.number(), cards: z.number(), removed: z.number() }).optional(),
});

const BuriedYearSchema = z.object({
  year: z.number(),
  cutoff_date: z.string(),
  card_back_image_key: z.string().nullable(),
  published_at: z.string().nullable(),
  has_generator: z.boolean(),
  player_count: z.number(),
  dm_sent_count: z.number(),
  dm_pending_count: z.number(),
  last_generated_at: z.string().nullable(),
  generation: GenerationStatusSchema,
});

async function requireReporter(c: Parameters<RouteHandler<typeof getBuriedYearsRoute, AppEnv>>[0]) {
  const { id } = c.get("jwtPayload") as { id: string };
  return (await isRankingReporter(id)) ? id : null;
}

// ── GET /buried/years ──────────────────────────────────────────────────────

export const getBuriedYearsRoute = createRoute({
  method: "get",
  path: "/buried/years",
  responses: {
    200: { content: { "application/json": { schema: z.array(BuriedYearSchema) } }, description: "Buried editions with status" },
    403: forbidden,
  },
});

export const getBuriedYearsHandler: RouteHandler<typeof getBuriedYearsRoute, AppEnv> = async (c) => {
  if (!(await requireReporter(c))) return c.json({ error: "Forbidden" }, 403);

  const rows = await c
    .get("db")
    .selectFrom("buried_year")
    .leftJoin("buried_player", "buried_player.year", "buried_year.year")
    .groupBy("buried_year.year")
    .select([
      "buried_year.year",
      sql<string>`to_char(buried_year.cutoff_date, 'YYYY-MM-DD')`.as("cutoff_date"),
      "buried_year.card_back_image_key",
      "buried_year.published_at",
      sql<number>`count(buried_player.player_id)::int`.as("player_count"),
      sql<number>`count(buried_player.dm_sent_at)::int`.as("dm_sent_count"),
      sql<number>`count(buried_player.player_id) filter (
        where buried_player.dm_sent_at is null
        and exists (select 1 from player where player.id = buried_player.player_id and player.discord_id is not null)
      )::int`.as("dm_pending_count"),
      sql<Date | null>`max(buried_player.generated_at)`.as("last_generated_at"),
    ])
    .orderBy("buried_year.year", "desc")
    .execute();

  return c.json(
    rows.map((r) => ({
      ...r,
      published_at: r.published_at?.toISOString() ?? null,
      last_generated_at: r.last_generated_at ? new Date(r.last_generated_at).toISOString() : null,
      has_generator: r.year in EDITIONS,
      generation: generationStatus(r.year),
    })),
    200,
  );
};

// ── PUT /buried/years/{year} ───────────────────────────────────────────────

export const updateBuriedYearRoute = createRoute({
  method: "put",
  path: "/buried/years/{year}",
  request: {
    params: YearParams,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            card_back_image_key: z.string().nullable().optional(),
            cutoff_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            published: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ message: z.string() }) } }, description: "Updated" },
    403: forbidden,
    404: notFound,
  },
});

export const updateBuriedYearHandler: RouteHandler<typeof updateBuriedYearRoute, AppEnv> = async (c) => {
  if (!(await requireReporter(c))) return c.json({ error: "Forbidden" }, 403);
  const year = Number(c.req.valid("param").year);
  const body = c.req.valid("json");

  const result = await c
    .get("db")
    .updateTable("buried_year")
    .set({
      ...(body.card_back_image_key !== undefined ? { card_back_image_key: body.card_back_image_key } : {}),
      ...(body.cutoff_date !== undefined ? { cutoff_date: body.cutoff_date } : {}),
      // Keep the original publish time if it's re-published.
      ...(body.published === true ? { published_at: sql<Date>`coalesce(published_at, CURRENT_TIMESTAMP)` } : {}),
      ...(body.published === false ? { published_at: null } : {}),
    })
    .where("year", "=", year)
    .executeTakeFirst();

  if (Number(result.numUpdatedRows) === 0) return c.json({ error: "No such year" }, 404);
  return c.json({ message: "Updated" }, 200);
};

// ── POST /buried/years/{year}/generate ─────────────────────────────────────

export const generateBuriedRoute = createRoute({
  method: "post",
  path: "/buried/years/{year}/generate",
  request: { params: YearParams },
  responses: {
    202: { content: { "application/json": { schema: GenerationStatusSchema } }, description: "Generation started (poll GET /buried/years)" },
    403: forbidden,
    404: notFound,
    409: { content: { "application/json": { schema: ErrorSchema } }, description: "Already running" },
  },
});

export const generateBuriedHandler: RouteHandler<typeof generateBuriedRoute, AppEnv> = async (c) => {
  if (!(await requireReporter(c))) return c.json({ error: "Forbidden" }, 403);
  const year = Number(c.req.valid("param").year);
  if (!(year in EDITIONS)) return c.json({ error: `No generator for ${year}` }, 404);

  const db = c.get("db");
  const started = startGeneration(year, () => generateBuried(db, year, { images: s3ImageIO }));
  if (!started) return c.json({ error: "Generation is already running" }, 409);
  return c.json(generationStatus(year), 202);
};

// ── POST /buried/years/{year}/dm-test ──────────────────────────────────────

export const buriedTestDmRoute = createRoute({
  method: "post",
  path: "/buried/years/{year}/dm-test",
  request: { params: YearParams },
  responses: {
    200: { content: { "application/json": { schema: z.object({ playerId: z.number().nullable() }) } }, description: "Test DM sent to the caller" },
    403: forbidden,
  },
});

export const buriedTestDmHandler: RouteHandler<typeof buriedTestDmRoute, AppEnv> = async (c) => {
  const userId = await requireReporter(c);
  if (!userId) return c.json({ error: "Forbidden" }, 403);
  const year = Number(c.req.valid("param").year);
  return c.json(await sendBuriedTestDm(c.get("db"), year, userId), 200);
};

// ── POST /buried/years/{year}/dm-all ───────────────────────────────────────

export const buriedDmAllRoute = createRoute({
  method: "post",
  path: "/buried/years/{year}/dm-all",
  request: { params: YearParams },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ sent: z.number(), failed: z.number(), skipped: z.number() }) } },
      description: "DMs sent to every player not yet DMed",
    },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not published, or not prod" },
    403: forbidden,
    404: notFound,
  },
});

export const buriedDmAllHandler: RouteHandler<typeof buriedDmAllRoute, AppEnv> = async (c) => {
  if (!(await requireReporter(c))) return c.json({ error: "Forbidden" }, 403);
  const year = Number(c.req.valid("param").year);

  // Dev Discord config still DMs real people, so only prod may bulk-send.
  if (process.env.DEPLOY_ENV !== "prod") {
    return c.json({ error: "Bulk DMs only run in prod — use the test DM locally" }, 400);
  }

  const row = await c.get("db").selectFrom("buried_year").where("year", "=", year).select("published_at").executeTakeFirst();
  if (!row) return c.json({ error: "No such year" }, 404);
  if (!row.published_at) return c.json({ error: "Publish the year before DMing links" }, 400);

  return c.json(await sendBuriedDms(c.get("db"), year), 200);
};
