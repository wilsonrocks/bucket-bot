import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { getCaptainTeamIds, isRankingReporter } from "../permissions.js";

const ErrorSchema = z.object({ error: z.string() });

export const hasRankingReporterRoleRoute = createRoute({
  method: "get",
  path: "/has-role",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            rankingReporter: z.boolean(),
            captainOfTeamIds: z.array(z.number()),
          }),
        },
      },
      description: "The user's permissions",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing user ID",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Discord API error",
    },
  },
});

export const hasRankingReporterRole: RouteHandler<typeof hasRankingReporterRoleRoute, AppEnv> = async (c) => {
  const jwtPayload = c.get("jwtPayload") as { id: string; username: string; global_name: string };
  const { id: userId } = jwtPayload;

  if (typeof userId !== "string") {
    return c.json({ error: "Missing userId" }, 400);
  }

  let rankingReporter: boolean;
  try {
    rankingReporter = await isRankingReporter(userId);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch Discord role" }, 500);
  }

  const captainOfTeamIds = await getCaptainTeamIds(userId, c.get("db"));

  return c.json({ rankingReporter, captainOfTeamIds }, 200);
};
