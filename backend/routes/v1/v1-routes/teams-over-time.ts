import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const TeamSnapshotGroupSchema = z.object({
  date: z.string(),
  teams: z.array(
    z.object({
      team_id: z.number(),
      team_name: z.string(),
      total_points: z.number(),
      rank: z.number(),
      brand_colour: z.string().nullable(),
    }),
  ),
});

export const getTeamsOverTimeRoute = createRoute({
  method: "get",
  path: "/teams-over-time/{typeCode}",
  request: {
    params: z.object({ typeCode: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TeamSnapshotGroupSchema) } },
      description: "Team ranking stats grouped by snapshot date",
    },
  },
});

export const getTeamsOverTimeHandler: RouteHandler<typeof getTeamsOverTimeRoute, AppEnv> = async (c) => {
  const { typeCode } = c.req.valid("param");

  const rows = await c.get("db")
    .selectFrom("team_ranking_snapshot")
    .innerJoin("team_ranking_snapshot_batch", "team_ranking_snapshot.batch_id", "team_ranking_snapshot_batch.id")
    .innerJoin("team", "team_ranking_snapshot.team_id", "team.id")
    .where("team_ranking_snapshot_batch.type_code", "=", typeCode)
    .where("team_ranking_snapshot.rank", "<=", 16)
    .select([
      "team_ranking_snapshot.batch_id",
      "team_ranking_snapshot.team_id",
      "team_ranking_snapshot.rank",
      "team_ranking_snapshot.total_points",
      "team_ranking_snapshot_batch.created_at as snapshot_date",
      "team.name as team_name",
      "team.brand_colour",
    ])
    .orderBy("team_ranking_snapshot_batch.created_at", "asc")
    .execute();

  if (rows.length === 0) {
    return c.json([] as any, 200);
  }

  const grouped = Object.values(
    rows.reduce(
      (acc, row) => {
        const key = row.snapshot_date.toISOString();
        if (!acc[key]) {
          acc[key] = { date: row.snapshot_date, teams: [] };
        }
        acc[key].teams.push({
          team_id: row.team_id,
          team_name: row.team_name,
          total_points: row.total_points,
          rank: row.rank,
          brand_colour: row.brand_colour,
        });
        return acc;
      },
      {} as Record<string, any>,
    ),
  );

  const zeroRecord = {
    date: new Date("2026-01-01"),
    teams: grouped[0].teams.map((t: any) => ({ ...t, total_points: 0, rank: 0 })),
  };

  return c.json([zeroRecord, ...grouped] as any, 200);
};
