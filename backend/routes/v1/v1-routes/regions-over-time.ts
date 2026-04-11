import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const RegionSnapshotGroupSchema = z.object({
  date: z.string(),
  regions: z.array(
    z.object({
      region_id: z.number(),
      geojson_name: z.string(),
      event_count: z.number(),
    }),
  ),
});

export const getRegionsOverTimeRoute = createRoute({
  method: "get",
  path: "/regions-over-time",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(RegionSnapshotGroupSchema),
        },
      },
      description: "Region event counts grouped by snapshot date",
    },
  },
});

export const getRegionsOverTimeHandler: RouteHandler<
  typeof getRegionsOverTimeRoute,
  AppEnv
> = async (c) => {
  const rows = await c
    .get("db")
    .selectFrom("region_snapshot")
    .innerJoin(
      "region_snapshot_batch",
      "region_snapshot.batch_id",
      "region_snapshot_batch.id",
    )
    .innerJoin("region", "region_snapshot.region_id", "region.id")
    .select([
      "region_snapshot.batch_id",
      "region_snapshot.region_id",
      "region_snapshot.event_count",
      "region_snapshot_batch.created_at as snapshot_date",
      "region.geojson_name",
    ])
    .orderBy("region_snapshot_batch.created_at", "asc")
    .execute();

  const grouped = Object.values(
    rows.reduce(
      (acc, row) => {
        const key = row.snapshot_date.toISOString();
        if (!acc[key]) {
          acc[key] = { date: key, regions: [] };
        }
        acc[key].regions.push({
          region_id: row.region_id,
          geojson_name: row.geojson_name,
          event_count: row.event_count,
        });
        return acc;
      },
      {} as Record<string, { date: string; regions: { region_id: number; geojson_name: string; event_count: number }[] }>,
    ),
  );

  if (grouped.length === 0) {
    return c.json([], 200);
  }

  const zeroRecord = {
    date: new Date("2026-01-01").toISOString(),
    regions: grouped[0].regions.map((r) => ({ ...r, event_count: 0 })),
  };

  return c.json([zeroRecord, ...grouped] as any, 200);
};
