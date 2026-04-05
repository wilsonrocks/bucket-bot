import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import type { AppEnv } from "../../../hono-env.js";

const VenueSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    town: z.string(),
    post_code: z.string().nullable(),
    created_at: z.string().nullable(),
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
    .selectAll()
    .orderBy("name")
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

  const postcodeResponse = await fetch(
    `https://api.postcodes.io/postcodes/${postCode}`,
  );
  const postcodeData = await postcodeResponse.json();

  if (postcodeData.status >= 400) {
    return c.json({ error: postcodeData.error as string }, 400);
  }

  const {
    latitude,
    longitude,
    region,
    country,
    postcode: post_code,
  } = postcodeData.result;

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
