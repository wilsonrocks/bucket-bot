import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { diffAwards } from "./reconcile";
import { ACHIEVEMENT_RULES, type AchievementRule } from "./rules";

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
}

/**
 * Recomputes every achievement from current results and reconciles the
 * player_achievement table: new awards are inserted (unannounced), moved awards
 * are repointed (keeping announcement state), and awards that no longer
 * qualify — e.g. after an identity is detached — are removed.
 */
export async function syncAchievements(
  db: Kysely<DB>,
  rules: Record<string, AchievementRule> = ACHIEVEMENT_RULES,
): Promise<SyncResult> {
  const achievements = await db.selectFrom("achievement").select("id").execute();
  const dbIds = new Set(achievements.map((a) => a.id));
  const ruleIds = new Set(Object.keys(rules));
  // A rule without a row can't be awarded (FK), so that's a deploy mistake.
  // Rows without a rule are fine: they're achievements not implemented yet.
  const missingRows = [...ruleIds].filter((id) => !dbIds.has(id));
  if (missingRows.length > 0) {
    throw new Error(
      `Achievement rules have no matching achievement row: [${missingRows.join(", ")}]`,
    );
  }

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("player_achievement")
      .select([
        "player_id as playerId",
        "achievement_id as achievementId",
        "tourney_id as tourneyId",
        sql<string>`to_char(achieved_on, 'YYYY-MM-DD')`.as("achievedOn"),
      ])
      .execute();

    const result: SyncResult = { inserted: 0, updated: 0, deleted: 0 };

    for (const [achievementId, rule] of Object.entries(rules)) {
      const { inserts, updates, deletes } = diffAwards(
        achievementId,
        existing,
        await rule(trx),
      );

      if (inserts.length > 0) {
        await trx
          .insertInto("player_achievement")
          .values(
            inserts.map((i) => ({
              player_id: i.playerId,
              achievement_id: achievementId,
              tourney_id: i.tourneyId,
              achieved_on: i.achievedOn,
            })),
          )
          .execute();
      }

      for (const u of updates) {
        await trx
          .updateTable("player_achievement")
          .set({ tourney_id: u.tourneyId, achieved_on: u.achievedOn })
          .where("player_id", "=", u.playerId)
          .where("achievement_id", "=", achievementId)
          .execute();
      }

      if (deletes.length > 0) {
        await trx
          .deleteFrom("player_achievement")
          .where("achievement_id", "=", achievementId)
          .where(
            "player_id",
            "in",
            deletes.map((d) => d.playerId),
          )
          .execute();
      }

      result.inserted += inserts.length;
      result.updated += updates.length;
      result.deleted += deletes.length;
    }

    return result;
  });
}
