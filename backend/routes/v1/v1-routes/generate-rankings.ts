import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateAllPlayerRankings } from "../../../logic/pipeline/rankings-pipeline.js";
import { runManualStep } from "../../../logic/pipeline/run-step.js";

export const generateRankingsRoute = createRoute({
  method: "post",
  path: "/generate-rankings",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ rankings: z.array(z.unknown()) }),
        },
      },
      description: "Rankings generated",
    },
  },
});

export const generateRankingsHandler: RouteHandler<
  typeof generateRankingsRoute,
  AppEnv
> = async (c) => {
  await runManualStep(c.get("db"), "generate-player", (db) =>
    generateAllPlayerRankings(db),
  );
  return c.json({ rankings: [] }, 200);
};
