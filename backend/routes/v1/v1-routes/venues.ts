import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";
import { geocodePostcode } from "../../../logic/postcodes/geocode-postcode.js";

const VenueSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    town: z.string(),
    post_code: z.string().nullable(),
    created_at: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    region_name: z.string().nullable(),
  })
  .passthrough();

const ErrorSchema = z.object({ error: z.string() });

export const getAllVenuesRoute = createRoute({
  method: "get",
  path: "/venues",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(VenueSchema) } },
      description: "List of all venues",
    },
  },
});

export const getAllVenuesHandler: RouteHandler<
  typeof getAllVenuesRoute,
  AppEnv
> = async (c) => {
  const venues = await c
    .get("db")
    .selectFrom("venue")
    .leftJoin("region", "venue.region_id", "region.id")
    .select([
      "venue.id",
      "venue.name",
      "venue.town",
      "venue.post_code",
      sql<number | null>`ST_X(venue.geom)`.as("longitude"),
      sql<number | null>`ST_Y(venue.geom)`.as("latitude"),
      "region.postcodes_api_name as region_name",
    ])
    .orderBy("venue.name")
    .execute();
  return c.json(venues as any, 200);
};

const CreateVenueBodySchema = z.object({
  name: z.string(),
  town: z.string(),
  postCode: z.string(),
});

export const createVenueRoute = createRoute({
  method: "post",
  path: "/create-venue",
  request: {
    body: {
      content: { "application/json": { schema: CreateVenueBodySchema } },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
      description: "Venue created successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request or postcode",
    },
  },
});

export const createVenueHandler: RouteHandler<
  typeof createVenueRoute,
  AppEnv
> = async (c) => {
  const { name, town, postCode } = c.req.valid("json");

  const result = await geocodePostcode(postCode);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const { latitude, longitude, post_code, region, country } = result;

  const regionRow = await c
    .get("db")
    .selectFrom("region")
    .select("id")
    .where("postcodes_api_name", "=", region ?? country)
    .executeTakeFirst();

  await c
    .get("db")
    .insertInto("venue")
    .values({
      name,
      town,
      post_code,
      geom: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
      region_id: regionRow?.id ?? null,
    })
    .execute();

  return c.json({ success: true as const }, 201);
};

const ReGeocodeParamsSchema = z.object({ id: z.string() });

export const reGeocodeVenueRoute = createRoute({
  method: "post",
  path: "/venues/{id}/geocode",
  request: {
    params: ReGeocodeParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
      description: "Venue geocoded successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Postcode lookup failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Venue not found",
    },
  },
});

export const reGeocodeVenueHandler: RouteHandler<
  typeof reGeocodeVenueRoute,
  AppEnv
> = async (c) => {
  const { id: idStr } = c.req.valid("param");
  const id = Number(idStr);

  const venue = await c
    .get("db")
    .selectFrom("venue")
    .select("post_code")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!venue) {
    return c.json({ error: "Venue not found" }, 404);
  }

  if (!venue.post_code) {
    return c.json({ error: "Venue has no postcode" }, 400);
  }

  const result = await geocodePostcode(venue.post_code);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const { latitude, longitude, region, country } = result;

  const regionRow = await c
    .get("db")
    .selectFrom("region")
    .select("id")
    .where("postcodes_api_name", "=", region ?? country)
    .executeTakeFirst();

  await c
    .get("db")
    .updateTable("venue")
    .set({
      geom: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
      region_id: regionRow?.id ?? null,
    })
    .where("id", "=", id)
    .execute();

  return c.json({ success: true as const }, 200);
};
