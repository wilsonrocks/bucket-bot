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
  new_player: z.boolean(),
  current_team_id: z.number().nullable(),
  current_team_name: z.string().nullable(),
  team_image_key: z.string().nullable(),
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

  const rankings = await db
    .selectFrom("ranking_snapshot")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id",
    )
    .leftJoin("membership as current_m", (join) =>
      join
        .onRef("current_m.player_id", "=", "player.id")
        .on("current_m.left_date", "is", null),
    )
    .leftJoin("team as current_team", "current_team.id", "current_m.team_id")
    .where("batch_id", "=", snapshot.id)
    .where("type_code", "=", typeCode)
    .select([
      "ranking_snapshot.rank",
      "ranking_snapshot.total_points",
      "ranking_snapshot.player_id",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.type_code",
      "player.id",
      "player.name",
      "player.short_name",
      "ranking_snapshot.rank_change",
      "ranking_snapshot.new_player",
      "current_team.id as current_team_id",
      "current_team.name as current_team_name",
      "current_team.image_key as team_image_key",
    ])
    .orderBy("ranking_snapshot.rank", "asc")
    .execute();

  return c.json(rankings as any, 200);
};
