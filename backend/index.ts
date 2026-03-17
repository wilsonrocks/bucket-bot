import { serve } from "@hono/node-server";
import app from "./app.js";

serve({ fetch: app.fetch, port: 9999 }, () => {
  console.log("Server is running on port 9999");
});
