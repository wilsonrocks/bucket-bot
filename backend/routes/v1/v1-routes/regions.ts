import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const RegionEventCountSchema = z.object({
  id: z.number(),
  geojson_name: z.string(),
  event_count: z.number(),
});

export const getRegionEventCountsRoute = createRoute({
  method: "get",
  path: "/regions/event-counts",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(RegionEventCountSchema) },
      },
      description: "Event counts per region",
    },
  },
});

export const getRegionEventCountsHandler: RouteHandler<
  typeof getRegionEventCountsRoute,
  AppEnv
> = async (c) => {
  const rows = await c
    .get("db")
    .selectFrom("region")
    .leftJoin("venue", "venue.region_id", "region.id")
    .leftJoin("tourney", "tourney.venue_id", "venue.id")
    .select((eb) => [
      "region.id",
      "region.geojson_name",
      eb.fn.count("tourney.id").as("event_count"),
    ])
    .groupBy(["region.id", "region.geojson_name"])
    .execute();

  return c.json(
    rows.map((r) => ({ ...r, event_count: Number(r.event_count) })) as any,
    200
  );
};
