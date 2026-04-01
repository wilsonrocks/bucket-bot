import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { mostRecentSnapshot } from "../../../logic/most-recent-snapshot.js";

const RankingEntrySchema = z.object({
  rank: z.number().nullable(),
  total_points: z.number().nullable(),
  player_id: z.number().nullable(),
  batch_id: z.number().nullable(),
  type_code: z.string().nullable(),
  id: z.number(),
  name: z.string(),
  short_name: z.string().nullable(),
});

export const rankingsRoute = createRoute({
  method: "get",
  path: "/rankings/{typeCode}",
  request: {
    params: z.object({ typeCode: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(RankingEntrySchema) } },
      description: "Rankings for a given type",
    },
  },
});

export const rankingsHandler: RouteHandler<typeof rankingsRoute, AppEnv> = async (c) => {
  const { typeCode } = c.req.valid("param");
  const snapshot = await mostRecentSnapshot(c.get("db"), typeCode);
  const snapshotId = snapshot.id;
  const rankings = await c.get("db")
    .selectFrom("ranking_snapshot")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id",
    )
    .where("batch_id", "=", snapshotId)
    .where("type_code", "=", typeCode)
    .selectAll()
    .orderBy("rank", "asc")
    .execute();

  return c.json(rankings as any, 200);
};
