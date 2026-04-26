import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { isRankingReporter } from "../permissions.js";

const FeatureFlagSchema = z.object({
  flag: z.string(),
  is_enabled: z.boolean(),
});

export const getAllFeatureFlagsRoute = createRoute({
  method: "get",
  path: "/feature-flags",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FeatureFlagSchema) } },
      description: "List of feature flags",
    },
  },
});

export const getAllFeatureFlags: RouteHandler<typeof getAllFeatureFlagsRoute, AppEnv> = async (c) => {
  const flags = await c.get("db").selectFrom("feature_flag").selectAll().orderBy("flag").execute();
  return c.json(flags as any, 200);
};

export const updateFeatureFlagRoute = createRoute({
  method: "patch",
  path: "/feature-flags/{flag}",
  request: {
    params: z.object({ flag: z.string() }),
    body: {
      content: { "application/json": { schema: z.object({ is_enabled: z.boolean() }) } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: FeatureFlagSchema } },
      description: "Updated feature flag",
    },
    403: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Not found",
    },
  },
});

export const updateFeatureFlag: RouteHandler<typeof updateFeatureFlagRoute, AppEnv> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  if (!await isRankingReporter(userId)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { flag } = c.req.valid("param");
  const { is_enabled } = c.req.valid("json");
  const updated = await c.get("db")
    .updateTable("feature_flag")
    .set({ is_enabled })
    .where("flag", "=", flag)
    .returningAll()
    .executeTakeFirst();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated as any, 200);
};
