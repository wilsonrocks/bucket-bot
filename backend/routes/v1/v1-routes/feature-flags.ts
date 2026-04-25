import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

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
  const flags = await c.get("db").selectFrom("feature_flag").selectAll().execute();
  return c.json(flags as any, 200);
};
