import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import {
  getDiscordClient,
  RANKING_REPORTER_ROLE_ID,
  UK_MALIFAUX_SERVER_ID,
} from "../../../logic/discord-client.js";

const ErrorSchema = z.object({ error: z.string() });

export const hasRankingReporterRoleRoute = createRoute({
  method: "get",
  path: "/has-role",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ rankingReporter: z.boolean() }) } },
      description: "Whether the user has the ranking reporter role",
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

  const discordClient = await getDiscordClient();

  let guild;
  try {
    guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch guild" }, 500);
  }

  let member;
  try {
    member = await guild.members.fetch(userId);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch guild member" }, 500);
  }

  const hasRole = member.roles.cache.has(RANKING_REPORTER_ROLE_ID);
  return c.json({ rankingReporter: hasRole }, 200);
};
