import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbClient } from "./db-client.js";
import type { AppEnv } from "./hono-env.js";
import { v1Router } from "./routes/v1/v1-router.js";

const app = new OpenAPIHono<AppEnv>();

app.use("*", cors());
app.use("*", logger());
app.use("*", async (c, next) => {
  c.set("db", dbClient);
  await next();
});

app.onError((err, c) => {
  console.error(err);
  const status = "status" in err ? Number(err.status) : 500;
  return c.json({ error: err.message }, status as any);
});

app.route("/v1", v1Router);

export default app;
