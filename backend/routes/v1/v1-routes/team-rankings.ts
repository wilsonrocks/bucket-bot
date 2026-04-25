import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { postTeamRankingsToDiscord } from "../../../logic/discord/team-rankings.js";

const TeamRankingEntrySchema = z.object({
  batch_id: z.number(),
  team_id: z.number(),
  team_name: z.string(),
  rank: z.number(),
  total_points: z.number(),
  rank_change: z.number().nullable(),
  new_team: z.boolean(),
});

// ── GET /team-rankings/{typeCode} ──────────────────────────────────────────

export const teamRankingsRoute = createRoute({
  method: "get",
  path: "/team-rankings/{typeCode}",
  request: {
    params: z.object({ typeCode: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TeamRankingEntrySchema) } },
      description: "Team rankings for a given type",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "No snapshot found for this type",
    },
  },
});

export const teamRankingsHandler: RouteHandler<typeof teamRankingsRoute, AppEnv> = async (c) => {
  const { typeCode } = c.req.valid("param");
  const db = c.get("db");

  const batch = await db
    .selectFrom("team_ranking_snapshot_batch")
    .selectAll()
    .where("type_code", "=", typeCode)
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!batch) {
    return c.json({ error: `No team ranking snapshot found for type: ${typeCode}` }, 404);
  }

  const rankings = await db
    .selectFrom("team_ranking_snapshot")
    .innerJoin("team", "team_ranking_snapshot.team_id", "team.id")
    .where("batch_id", "=", batch.id)
    .select([
      "team_ranking_snapshot.batch_id",
      "team_ranking_snapshot.team_id",
      "team.name as team_name",
      "team_ranking_snapshot.rank",
      "team_ranking_snapshot.total_points",
      "team_ranking_snapshot.rank_change",
      "team_ranking_snapshot.new_team",
    ])
    .orderBy("rank", "asc")
    .execute();

  return c.json(rankings as any, 200);
};

// ── POST /post-team-rankings ───────────────────────────────────────────────

export const postTeamRankingsRoute = createRoute({
  method: "post",
  path: "/post-team-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Team rankings posted to Discord",
    },
  },
});

export const postTeamRankingsHandler: RouteHandler<typeof postTeamRankingsRoute, AppEnv> = async (c) => {
  await postTeamRankingsToDiscord(c.get("db"));
  return c.json({ message: "Team rankings posted to Discord" }, 200);
};
