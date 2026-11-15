import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";
import { isRankingReporter } from "../permissions.js";
import { syncUpcomingEvents } from "../../../logic/calendar/sync-upcoming-events.js";

const UpcomingEventSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    starts_at: z.string(),
    venue_id: z.number().nullable(),
    venue_name: z.string().nullable(),
    organiser_discord_ids: z.array(z.string()),
    location: z.string().nullable(),
  })
  .passthrough();

const ErrorSchema = z.object({ error: z.string() });

// ── GET /upcoming-events (public) ───────────────────────────────────────────

export const getUpcomingEventsRoute = createRoute({
  method: "get",
  path: "/upcoming-events",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(UpcomingEventSchema) } },
      description: "List of upcoming events",
    },
  },
});

export const getUpcomingEventsHandler: RouteHandler<
  typeof getUpcomingEventsRoute,
  AppEnv
> = async (c) => {
  const events = await c
    .get("db")
    .selectFrom("upcoming_event")
    .leftJoin("venue", "upcoming_event.venue_id", "venue.id")
    .select([
      "upcoming_event.id",
      "upcoming_event.name",
      "upcoming_event.starts_at",
      "upcoming_event.venue_id",
      "venue.name as venue_name",
      sql<string[]>`ARRAY(
        SELECT discord_user_id FROM upcoming_event_organiser
        WHERE upcoming_event_id = upcoming_event.id
        ORDER BY discord_user_id
      )`.as("organiser_discord_ids"),
      "upcoming_event.location",
    ])
    .where("upcoming_event.starts_at", ">=", new Date())
    .orderBy("upcoming_event.starts_at")
    .execute();
  return c.json(events as any, 200);
};

// ── PUT /upcoming-events/{id}/venue (protected) ─────────────────────────────

const SetVenueParamsSchema = z.object({ id: z.string() });
const SetVenueBodySchema = z.object({ venue_id: z.number().nullable() });

export const setUpcomingEventVenueRoute = createRoute({
  method: "put",
  path: "/upcoming-events/{id}/venue",
  request: {
    params: SetVenueParamsSchema,
    body: { content: { "application/json": { schema: SetVenueBodySchema } } },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
      description: "Venue updated",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Event not found",
    },
  },
});

export const setUpcomingEventVenueHandler: RouteHandler<
  typeof setUpcomingEventVenueRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  const id = Number(c.req.valid("param").id);

  // Only ranking reporters can edit upcoming events.
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { venue_id } = c.req.valid("json");

  const updated = await c
    .get("db")
    .updateTable("upcoming_event")
    .set({ venue_id })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();

  if (!updated) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};

// ── PUT /upcoming-events/{id}/organisers (ranking reporter only) ────────────

const SetOrganisersParamsSchema = z.object({ id: z.string() });
const SetOrganisersBodySchema = z.object({
  organiser_discord_ids: z.array(z.string()),
});

export const setUpcomingEventOrganisersRoute = createRoute({
  method: "put",
  path: "/upcoming-events/{id}/organisers",
  request: {
    params: SetOrganisersParamsSchema,
    body: {
      content: { "application/json": { schema: SetOrganisersBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
      description: "Organisers updated",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Event not found",
    },
  },
});

export const setUpcomingEventOrganisersHandler: RouteHandler<
  typeof setUpcomingEventOrganisersRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };

  // Only ranking reporters can assign who the organisers (TOs) are.
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = Number(c.req.valid("param").id);
  const { organiser_discord_ids } = c.req.valid("json");

  const found = await c
    .get("db")
    .transaction()
    .execute(async (trx) => {
      const event = await trx
        .selectFrom("upcoming_event")
        .select("id")
        .where("id", "=", id)
        .forUpdate()
        .executeTakeFirst();
      if (!event) return false;

      await trx
        .deleteFrom("upcoming_event_organiser")
        .where("upcoming_event_id", "=", id)
        .execute();
      const unique = [...new Set(organiser_discord_ids)];
      if (unique.length > 0) {
        await trx
          .insertInto("upcoming_event_organiser")
          .values(
            unique.map((discord_user_id) => ({
              upcoming_event_id: id,
              discord_user_id,
            })),
          )
          .execute();
      }
      return true;
    });

  if (!found) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};

// ── POST /sync-upcoming-events (protected, manual refresh) ──────────────────

export const syncUpcomingEventsRoute = createRoute({
  method: "post",
  path: "/sync-upcoming-events",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            upserted: z.number(),
            deleted: z.number(),
          }),
        },
      },
      description: "Sync result",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

export const syncUpcomingEventsHandler: RouteHandler<
  typeof syncUpcomingEventsRoute,
  AppEnv
> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!(await isRankingReporter(userId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await syncUpcomingEvents(c.get("db"));
  return c.json(result, 200);
};
