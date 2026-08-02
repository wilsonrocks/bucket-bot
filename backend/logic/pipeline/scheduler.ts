import cron from "node-cron";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { runPipeline } from "./rankings-pipeline.js";
import { syncUpcomingEvents } from "../calendar/sync-upcoming-events.js";

// Every Monday at 09:00 UK time (Europe/London handles BST/GMT automatically).
const WEEKLY_CRON = "0 9 * * 1";
// Every day at 08:00 UK time.
const DAILY_CALENDAR_CRON = "0 8 * * *";
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

/**
 * Arms the daily Google Calendar sync that refreshes the upcoming_event table.
 * Gated on ENABLE_SCHEDULER like the rankings pipeline.
 */
export function startCalendarScheduler(db: Kysely<DB>): void {
  cron.schedule(
    DAILY_CALENDAR_CRON,
    async () => {
      console.log("Starting scheduled upcoming-events calendar sync");
      try {
        const { upserted, deleted } = await syncUpcomingEvents(db);
        console.log(
          `Upcoming-events sync finished: ${upserted} upserted, ${deleted} deleted`,
        );
      } catch (err) {
        console.error("Scheduled upcoming-events calendar sync failed:", err);
      }
    },
    { timezone: TIMEZONE },
  );
  console.log(
    `Upcoming-events calendar sync scheduled for '${DAILY_CALENDAR_CRON}' (${TIMEZONE})`,
  );
}
