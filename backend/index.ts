import { serve } from "@hono/node-server";
import app from "./app.js";
import { dbClient } from "./db-client.js";
import {
  startCalendarScheduler,
  startScheduler,
} from "./logic/pipeline/scheduler.js";

serve({ fetch: app.fetch, port: 9999 }, () => {
  console.log("Server is running on port 9999");
});

if (process.env.ENABLE_SCHEDULER === "true") {
  startScheduler(dbClient);
  startCalendarScheduler(dbClient);
}
