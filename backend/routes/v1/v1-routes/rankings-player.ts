import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const PlayerRankingHistorySchema = z.object({
  metadata: z.object({ number_of_players: z.number().nullable() }),
  rankings: z.array(
    z.object({
      batch_id: z.number().nullable(),
      created_at: z.string().nullable(),
      rank: z.number().nullable(),
      total_points: z.number().nullable(),
      name: z.string(),
    }),
  ),
});

const ErrorSchema = z.object({ error: z.string() });

export const rankingsPlayerRoute = createRoute({
  method: "get",
  path: "/rankings/:playerId/:typeCode",
  request: {
    params: z.object({ playerId: z.string(), typeCode: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: PlayerRankingHistorySchema } },
      description: "Player ranking history for a given type",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing required parameters",
    },
  },
});

export const rankingsPlayerHandler: RouteHandler<typeof rankingsPlayerRoute, AppEnv> = async (c) => {
  const { playerId, typeCode } = c.req.valid("param");

  const db = c.get("db");

  const metadataPromise = db
    .selectFrom("ranking_snapshot")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id",
    )
    .where("type_code", "=", typeCode)
    .select(({ fn }) =>
      fn.max<number>("ranking_snapshot.rank").as("number_of_players"),
    )
    .executeTakeFirstOrThrow();

  const rankingsPromise = db
    .selectFrom("ranking_snapshot")
    .where("player_id", "=", Number(playerId))
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id",
    )
    .where("ranking_snapshot_batch.type_code", "=", typeCode)
    .select([
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.created_at",
      "ranking_snapshot.rank",
      "ranking_snapshot.total_points",
      "player.name",
    ])
    .execute();

  const [metadata, rankings] = await Promise.all([metadataPromise, rankingsPromise]);

  return c.json({ metadata, rankings } as any, 200);
};
