import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const RankingTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const rankingTypesRoute = createRoute({
  method: "get",
  path: "/ranking-types",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(RankingTypeSchema) } },
      description: "Available ranking types",
    },
  },
});

export const rankingTypesHandler: RouteHandler<typeof rankingTypesRoute, AppEnv> = async (c) => {
  const rankingTypes = await c.get("db")
    .selectFrom("ranking_snapshot_type")
    .where("display", "=", true)
    .select(["code", "name", "description"])
    .orderBy("display_order")
    .execute();
  return c.json(rankingTypes as any, 200);
};
