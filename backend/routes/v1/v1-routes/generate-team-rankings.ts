import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateAllTeamRankings } from "../../../logic/pipeline/rankings-pipeline.js";
import { runManualStep } from "../../../logic/pipeline/run-step.js";

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
  await runManualStep(c.get("db"), "generate-team", (db) => generateAllTeamRankings(db));
  return c.json({ success: true as const }, 200);
};
