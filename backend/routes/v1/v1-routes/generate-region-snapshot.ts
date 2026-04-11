import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { generateRegionSnapshot } from "../../../logic/rankings/generate-region-snapshots.js";

export const generateRegionSnapshotRoute = createRoute({
  method: "post",
  path: "/generate-region-snapshot",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Region snapshot generated",
    },
  },
});

export const generateRegionSnapshotHandler: RouteHandler<
  typeof generateRegionSnapshotRoute,
  AppEnv
> = async (c) => {
  await generateRegionSnapshot(c.get("db"));
  return c.json({ ok: true }, 200);
};
