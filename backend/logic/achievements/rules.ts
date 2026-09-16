import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";

/** The earliest point at which a player satisfied an achievement. */
export interface Qualifier {
  playerId: number;
  tourneyId: number;
  /** ISO date (yyyy-MM-dd) of the qualifying tourney. */
  achievedOn: string;
}

export type AchievementRule = (db: Kysely<DB>) => Promise<Qualifier[]>;

/**
 * Earliest tourney per player among results matching `filter`. Ties on date
 * break on tourney id so the chosen tourney is stable between syncs.
 * Identities without a player can't hold achievements, so they're skipped.
 */
function firstQualifyingTourney(
  filter: (
    qb: ReturnType<typeof baseQuery>,
  ) => ReturnType<typeof baseQuery> = (qb) => qb,
): AchievementRule {
  return async (db) => {
    const rows = await filter(baseQuery(db))
      .distinctOn("player_identity.player_id")
      .select([
        "player_identity.player_id as playerId",
        "tourney.id as tourneyId",
        sql<string>`to_char(tourney.date, 'YYYY-MM-DD')`.as("achievedOn"),
      ])
      .orderBy("player_identity.player_id")
      .orderBy("tourney.date")
      .orderBy("tourney.id")
      .execute();
    return rows.map((r) => ({ ...r, playerId: r.playerId! }));
  };
}

function baseQuery(db: Kysely<DB>) {
  return db
    .selectFrom("result")
    .innerJoin(
      "player_identity",
      "player_identity.id",
      "result.player_identity_id",
    )
    .innerJoin("tourney", "tourney.id", "result.tourney_id")
    .where("player_identity.player_id", "is not", null);
}

/**
 * Rule per achievement id. Every id here must have a matching `achievement`
 * row (seeded by migration) and vice versa — syncAchievements enforces this.
 */
export const ACHIEVEMENT_RULES: Record<string, AchievementRule> = {
  "first-event": firstQualifyingTourney(),
  "first-victory": firstQualifyingTourney((qb) =>
    qb.where("result.place", "=", 1),
  ),
};
