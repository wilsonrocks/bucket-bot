import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { postDiscordRankings } from "../../../logic/discord/post-rankings.js";

export const postDiscordRankingsRoute = createRoute({
  method: "post",
  path: "/post-discord-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Rankings posted to Discord",
    },
  },
});

export const postDiscordRankingsHandler: RouteHandler<typeof postDiscordRankingsRoute, AppEnv> = async (c) => {
  await postDiscordRankings(c.get("db"));
  return c.json({ message: "Discord rankings posted successfully" }, 200);
};
