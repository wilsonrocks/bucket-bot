import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateRankings } from "../../../logic/rankings/generate-player-rankings.js";

export const generateRankingsRoute = createRoute({
  method: "post",
  path: "/generate-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ rankings: z.array(z.unknown()) }) } },
      description: "Rankings generated",
    },
  },
});

export const generateRankingsHandler: RouteHandler<typeof generateRankingsRoute, AppEnv> = async (c) => {
  const db = c.get("db");
  const rankings = await db.selectFrom("ranking_snapshot_type").selectAll().execute();

  const donePromises = await Promise.allSettled(
    rankings.map(async (rankingType) => {
      await generateRankings(db, rankingType.code);
    }),
  );
  const errors = donePromises.flatMap((p) => (p.status === "rejected" ? [p.reason] : []));
  if (errors.length > 0) {
    console.error(errors);
  }

  return c.json({ rankings: [] }, 200);
};
