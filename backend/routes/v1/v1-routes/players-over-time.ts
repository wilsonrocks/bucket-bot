import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const HEX_CODE = "#4A90D9";

const PlayerSnapshotGroupSchema = z.object({
  date: z.string(),
  players: z.array(
    z.object({
      player_id: z.number(),
      name: z.string(),
      rank: z.number(),
      total_points: z.number(),
      hex_code: z.string(),
    }),
  ),
});

export const getPlayersOverTimeRoute = createRoute({
  method: "get",
  path: "/players-over-time/{typeCode}",
  request: {
    params: z.object({ typeCode: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PlayerSnapshotGroupSchema) } },
      description: "Player ranking stats grouped by snapshot date",
    },
  },
});

export const getPlayersOverTime: RouteHandler<typeof getPlayersOverTimeRoute, AppEnv> = async (c) => {
  const { typeCode } = c.req.valid("param");

  const playerData = await c.get("db")
    .selectFrom("ranking_snapshot")
    .innerJoin("ranking_snapshot_batch", "ranking_snapshot.batch_id", "ranking_snapshot_batch.id")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .where("ranking_snapshot_batch.type_code", "=", typeCode)
    .select([
      "ranking_snapshot.player_id",
      "ranking_snapshot.rank",
      "ranking_snapshot.total_points",
      "ranking_snapshot_batch.created_at as snapshot_date",
      "player.name",
    ])
    .execute();

  const grouped = Object.values(
    playerData.reduce(
      (acc, row) => {
        const key = row.snapshot_date.toISOString();
        if (!acc[key]) {
          acc[key] = { date: row.snapshot_date, players: [] };
        }
        acc[key].players.push({
          player_id: row.player_id,
          name: row.name,
          rank: row.rank,
          total_points: row.total_points,
          hex_code: HEX_CODE,
        });
        return acc;
      },
      {} as Record<string, any>,
    ),
  );

  const zeroRecord = {
    date: new Date("2026-01-01"),
    players: grouped[0].players.map((p: any) => ({
      ...p,
      rank: 0,
      total_points: 0,
    })),
  };

  return c.json([zeroRecord, ...grouped] as any, 200);
};
