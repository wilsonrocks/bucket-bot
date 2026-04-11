import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { formatISO } from "date-fns";
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

  // Group by calendar date (not exact timestamp) and keep only the latest batch per day.
  // Multiple batches imported on the same day would each get their own animation frame,
  // causing a visible pause since the data barely changes between them.
  const groupedByDate = rows.reduce(
    (acc, row) => {
      const dateKey = formatISO(row.snapshot_date, { representation: "date" });
      // Rows are ordered by created_at asc, so later batches overwrite earlier ones
      // within the same day, leaving us with the latest snapshot for each date.
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, batchId: row.batch_id, regions: [] };
      }
      if (row.batch_id !== acc[dateKey].batchId) {
        // New (later) batch for the same date — start fresh for this date
        acc[dateKey] = { date: dateKey, batchId: row.batch_id, regions: [] };
      }
      acc[dateKey].regions.push({
        region_id: row.region_id,
        geojson_name: row.geojson_name,
        event_count: row.event_count,
      });
      return acc;
    },
    {} as Record<string, { date: string; batchId: number; regions: { region_id: number; geojson_name: string; event_count: number }[] }>,
  );

  const grouped = Object.values(groupedByDate).map(({ date, regions }) => ({
    date,
    regions,
  }));

  if (grouped.length === 0) {
    return c.json([], 200);
  }

  const zeroRecord = {
    date: "2026-01-01",
    regions: (grouped[0]?.regions ?? []).map((r) => ({ ...r, event_count: 0 })),
  };

  return c.json([zeroRecord, ...grouped], 200);
};
