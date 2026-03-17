import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const TierSchema = z.object({
  code: z.string(),
  name: z.string(),
  created_at: z.string().nullable(),
});

export const getAllTiersRoute = createRoute({
  method: "get",
  path: "/tiers",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TierSchema) } },
      description: "List of tournament tiers",
    },
  },
});

export const getAllTiers: RouteHandler<typeof getAllTiersRoute, AppEnv> = async (c) => {
  const tiers = await c.get("db").selectFrom("tier").selectAll().execute();
  return c.json(tiers as any, 200);
};
