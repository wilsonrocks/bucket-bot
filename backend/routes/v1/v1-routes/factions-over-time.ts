import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const FactionSnapshotGroupSchema = z.object({
  date: z.string(),
  factions: z.array(
    z.object({
      faction_code: z.string(),
      declarations: z.number().nullable(),
      points_per_declaration: z.number().nullable(),
      total_points: z.number().nullable(),
      name: z.string(),
      hex_code: z.string(),
      short_name: z.string().nullable(),
    }),
  ),
});

export const getFactionsOverTimeRoute = createRoute({
  method: "get",
  path: "/factions-over-time",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FactionSnapshotGroupSchema) } },
      description: "Faction stats grouped by snapshot date",
    },
  },
});

export const getFactionsOverTime: RouteHandler<typeof getFactionsOverTimeRoute, AppEnv> = async (c) => {
  const factionData = await c.get("db")
    .selectFrom("faction_snapshot")
    .innerJoin("faction_snapshot_batch", "faction_snapshot.batch_id", "faction_snapshot_batch.id")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot.batch_id",
      "faction_snapshot.faction_code",
      "faction_snapshot.declarations",
      "faction_snapshot.points_per_declaration",
      "faction_snapshot.total_points",
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name",
      "faction.short_name",
      "faction.hex_code",
    ])
    .execute();

  const grouped = Object.values(
    factionData.reduce(
      (acc, row) => {
        const key = row.snapshot_date.toISOString();
        if (!acc[key]) {
          acc[key] = { date: row.snapshot_date, factions: [] };
        }
        acc[key].factions.push({
          faction_code: row.faction_code,
          declarations: row.declarations,
          points_per_declaration: row.points_per_declaration,
          total_points: row.total_points,
          name: row.name,
          hex_code: row.hex_code,
          short_name: row.short_name,
        });
        return acc;
      },
      {} as Record<string, any>,
    ),
  );

  const zeroRecord = {
    date: new Date("2026-01-01"),
    factions: grouped[0].factions.map((f: any) => ({
      ...f,
      declarations: 0,
      points_per_declaration: 0,
      total_points: 0,
    })),
  };

  return c.json([zeroRecord, ...grouped] as any, 200);
};
