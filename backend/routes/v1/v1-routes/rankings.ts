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
  rank_change: z.number().nullable(),
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
  const db = c.get("db");
  const snapshot = await mostRecentSnapshot(db, typeCode);
  const snapshotId = snapshot.id;

  const [rankings, previousBatch] = await Promise.all([
    db
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
      .execute(),
    db
      .selectFrom("ranking_snapshot_batch")
      .where("type_code", "=", typeCode)
      .where("id", "<", snapshotId)
      .orderBy("id", "desc")
      .limit(1)
      .select("id")
      .executeTakeFirst(),
  ]);

  const prevRankByPlayerId = new Map<number, number>();
  if (previousBatch) {
    const previousRankings = await db
      .selectFrom("ranking_snapshot")
      .where("batch_id", "=", previousBatch.id)
      .select(["player_id", "rank"])
      .execute();
    for (const r of previousRankings) {
      prevRankByPlayerId.set(r.player_id, r.rank);
    }
  }

  const rankingsWithChange = rankings.map((r) => {
    const prevRank = r.player_id != null ? prevRankByPlayerId.get(r.player_id) : undefined;
    return {
      ...r,
      rank_change: prevRank != null && r.rank != null ? prevRank - r.rank : null,
    };
  });

  return c.json(rankingsWithChange as any, 200);
};
