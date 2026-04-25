import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateTeamRankings } from "../../../logic/rankings/generate-team-rankings.js";

export const generateTeamRankingsRoute = createRoute({
  method: "post",
  path: "/generate-team-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Team rankings generated",
    },
  },
});

export const generateTeamRankingsHandler: RouteHandler<typeof generateTeamRankingsRoute, AppEnv> = async (c) => {
  const db = c.get("db");
  const rankingTypes = await db.selectFrom("ranking_snapshot_type").selectAll().execute();

  const results = await Promise.allSettled(
    rankingTypes.map((rt) => generateTeamRankings(db, rt.code)),
  );
  const errors = results.flatMap((p) => (p.status === "rejected" ? [p.reason] : []));
  if (errors.length > 0) {
    console.error(errors);
  }

  return c.json({ success: true as const }, 200);
};
