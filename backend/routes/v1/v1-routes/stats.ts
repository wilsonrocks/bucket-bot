import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { getCommunityTotals } from "../../../logic/stats/community-totals.js";

const CommunityStatsSchema = z.object({
  totalPlayers: z.number(),
  gamesPlayed: z.number(),
  totalEvents: z.number(),
});

export const communityStatsRoute = createRoute({
  method: "get",
  path: "/stats/community",
  responses: {
    200: {
      content: {
        "application/json": { schema: CommunityStatsSchema },
      },
      description: "Community-wide stats: total players, games played, and events",
    },
  },
});

export const communityStatsHandler: RouteHandler<
  typeof communityStatsRoute,
  AppEnv
> = async (c) => {
  const totals = await getCommunityTotals(c.get("db"));
  return c.json(totals, 200);
};
