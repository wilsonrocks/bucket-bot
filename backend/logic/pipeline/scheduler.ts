import cron from "node-cron";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { runPipeline } from "./rankings-pipeline.js";

// Every Monday at 09:00 UK time (Europe/London handles BST/GMT automatically).
const WEEKLY_CRON = "0 9 * * 1";
const TIMEZONE = "Europe/London";

/**
 * Arms the weekly rankings pipeline cron. Should only be called in production
 * (gate on ENABLE_SCHEDULER) so dev hot-reloads don't fire live Discord posts.
 */
export function startScheduler(db: Kysely<DB>): void {
  cron.schedule(
    WEEKLY_CRON,
    async () => {
      console.log("Starting scheduled rankings pipeline");
      try {
        const { runId, results } = await runPipeline(db, "scheduled");
        const failed = results.filter((r) => r.status !== "success").length;
        console.log(`Rankings pipeline ${runId} finished: ${failed} step(s) not successful`);
      } catch (err) {
        console.error("Scheduled rankings pipeline failed to run:", err);
      }
    },
    { timezone: TIMEZONE },
  );
  console.log(`Rankings pipeline scheduled for '${WEEKLY_CRON}' (${TIMEZONE})`);
}
