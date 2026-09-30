import { serve } from "@hono/node-server";
import app from "./app.js";
import { dbClient } from "./db-client.js";
import { startDiscordCommands } from "./logic/discord/subscription-commands.js";
import {
  startAchievementsScheduler,
  startCalendarScheduler,
  startScheduler,
} from "./logic/pipeline/scheduler.js";

serve({ fetch: app.fetch, port: 9999 }, () => {
  console.log("Server is running on port 9999");
});

if (process.env.ENABLE_SCHEDULER === "true") {
  startScheduler(dbClient);
  startCalendarScheduler(dbClient);
  // Off until achievements have names — the job posts them to Discord. Manual
  // sync/announce from the admin achievements page works either way.
  if (process.env.ENABLE_ACHIEVEMENTS_SCHEDULER === "true") {
    startAchievementsScheduler(dbClient);
  }
}

// Production only: a dev backend on the same bot token would race prod to
// answer each slash command.
if (process.env.ENABLE_DISCORD_COMMANDS === "true") {
  startDiscordCommands(dbClient).catch((err) => {
    console.error("Failed to start Discord slash commands:", err);
  });
}
