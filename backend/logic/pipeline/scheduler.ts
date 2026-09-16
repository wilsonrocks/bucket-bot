import cron from "node-cron";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { runPipeline } from "./rankings-pipeline.js";
import { syncUpcomingEvents } from "../calendar/sync-upcoming-events.js";
import { syncAchievements } from "../achievements/sync-achievements";
import { announceNextPlayer } from "../achievements/announce";
import { isUkWorkingHours } from "../achievements/working-hours";

// Every Monday at 09:00 UK time (Europe/London handles BST/GMT automatically).
const WEEKLY_CRON = "0 9 * * 1";
// Every day at 08:00 UK time.
const DAILY_CALENDAR_CRON = "0 8 * * *";
// Every half hour, all day; announcements are further limited to working hours.
const ACHIEVEMENTS_CRON = "*/30 * * * *";
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

/**
 * Arms the half-hourly achievements job: reconciles awards with current
 * results, then (during UK working hours only) announces one player's new
 * achievements so Discord isn't flooded. Gated on ENABLE_SCHEDULER.
 */
export function startAchievementsScheduler(db: Kysely<DB>): void {
  cron.schedule(
    ACHIEVEMENTS_CRON,
    () => runAchievementsTick(db),
    { timezone: TIMEZONE },
  );
  console.log(
    `Achievements sync/announce scheduled for '${ACHIEVEMENTS_CRON}' (${TIMEZONE})`,
  );
}

export async function runAchievementsTick(
  db: Kysely<DB>,
  now: Date = new Date(),
): Promise<void> {
  try {
    const { inserted, updated, deleted } = await syncAchievements(db);
    console.log(
      `Achievements sync finished: ${inserted} inserted, ${updated} updated, ${deleted} deleted`,
    );
  } catch (err) {
    console.error("Scheduled achievements sync failed:", err);
  }

  if (!isUkWorkingHours(now)) return;

  try {
    const playerId = await announceNextPlayer(db);
    if (playerId !== null) {
      console.log(`Announced achievements for player ${playerId}`);
    }
  } catch (err) {
    console.error("Scheduled achievements announcement failed:", err);
  }
}
