import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const PlayerSnapshotGroupSchema = z.object({
  date: z.string(),
  players: z.array(
    z.object({
      player_id: z.number(),
      name: z.string(),
      rank: z.number(),
      total_points: z.number(),
      factions: z.array(
        z.object({ hex_code: z.string(), faction_code: z.string() }),
      ),
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
      content: {
        "application/json": { schema: z.array(PlayerSnapshotGroupSchema) },
      },
      description: "Player ranking stats grouped by snapshot date",
    },
  },
});

export const getPlayersOverTime: RouteHandler<
  typeof getPlayersOverTimeRoute,
  AppEnv
> = async (c) => {
  const { typeCode } = c.req.valid("param");

  const playerData = await c
    .get("db")
    .selectFrom("ranking_snapshot")
    .innerJoin(
      "ranking_snapshot_batch",
      "ranking_snapshot.batch_id",
      "ranking_snapshot_batch.id",
    )
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .where("ranking_snapshot_batch.type_code", "=", typeCode)
    .where("ranking_snapshot.rank", "<=", 16)
    .select([
      "ranking_snapshot.player_id",
      "ranking_snapshot.batch_id",
      "ranking_snapshot.rank",
      "ranking_snapshot.total_points",
      "ranking_snapshot_batch.created_at as snapshot_date",
      "player.name",
    ])
    .execute();

  const batchIds = [...new Set(playerData.map((r) => r.batch_id))];

  const factionData =
    batchIds.length > 0
      ? await c
          .get("db")
          .selectFrom("ranking_snapshot_event")
          .innerJoin(
            "player_identity",
            "player_identity.player_id",
            "ranking_snapshot_event.player_id",
          )
          .innerJoin("result", (join) =>
            join
              .onRef("result.player_identity_id", "=", "player_identity.id")
              .onRef("result.tourney_id", "=", "ranking_snapshot_event.tourney_id"),
          )
          .innerJoin("faction", "faction.name_code", "result.faction_code")
          .innerJoin("tourney", "tourney.id", "ranking_snapshot_event.tourney_id")
          .where("ranking_snapshot_event.batch_id", "in", batchIds)
          .select([
            "ranking_snapshot_event.batch_id",
            "ranking_snapshot_event.player_id",
            "faction.hex_code",
            "faction.name_code as faction_code",
          ])
          .orderBy("tourney.created_at")
          .execute()
      : [];

  const factionMap = new Map<string, { hex_code: string; faction_code: string }[]>();
  for (const row of factionData) {
    const key = `${row.batch_id}-${row.player_id}`;
    if (!factionMap.has(key)) factionMap.set(key, []);
    factionMap.get(key)!.push({ hex_code: row.hex_code, faction_code: row.faction_code });
  }

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
          factions: factionMap.get(`${row.batch_id}-${row.player_id}`) ?? [],
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
