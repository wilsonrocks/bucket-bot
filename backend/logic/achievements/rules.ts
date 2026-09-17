import { sql, type Kysely, type RawBuilder } from "kysely";
import type { DB } from "kysely-codegen";
import { Faction } from "../fixtures";

/** The earliest point at which a player satisfied an achievement. */
export interface Qualifier {
  playerId: number;
  tourneyId: number;
  /** ISO date (yyyy-MM-dd) of the qualifying tourney. */
  achievedOn: string;
}

export type AchievementRule = (db: Kysely<DB>) => Promise<Qualifier[]>;

type Tier = "EVENT" | "GT" | "NATIONALS";

/**
 * Every result with its player and tourney. The per-tourney flags are computed
 * over all results — including identities not yet linked to a player — so a
 * placeholder finishing last still stops anyone else getting the wooden spoon.
 * Filter on player_id outside this subquery, never inside it.
 */
const RESULTS = sql`
  SELECT
    player_identity.player_id,
    result.tourney_id,
    tourney.date,
    tourney.venue_id,
    coalesce(tourney.tier_code, 'EVENT') AS tier_code,
    result.place,
    result.faction_code,
    result.place = max(result.place) OVER (PARTITION BY result.tourney_id)
      AS is_last,
    result.place = min(result.place) OVER (PARTITION BY result.tourney_id, result.faction_code)
      AS is_best_in_faction
  FROM result
  JOIN tourney ON tourney.id = result.tourney_id
  JOIN player_identity ON player_identity.id = result.player_identity_id
`;

/**
 * Picks the earliest candidate (player_id, tourney_id, date) row per player.
 * Ties on date break on tourney id so the chosen tourney is stable between
 * syncs. Rows without a player can't hold achievements, so they're dropped.
 */
function earliest(candidates: RawBuilder<unknown>): AchievementRule {
  return async (db) => {
    const { rows } = await sql<Qualifier>`
      SELECT DISTINCT ON (player_id)
        player_id AS "playerId",
        tourney_id AS "tourneyId",
        to_char(date, 'YYYY-MM-DD') AS "achievedOn"
      FROM (${candidates}) candidates
      WHERE player_id IS NOT NULL
      ORDER BY player_id, date, tourney_id
    `.execute(db);
    return rows;
  };
}

/** First result matching `condition` (columns of RESULTS). */
function firstResultWhere(condition: RawBuilder<unknown>): AchievementRule {
  return earliest(sql`SELECT * FROM (${RESULTS}) results WHERE ${condition}`);
}

const tier = (code: Tier) => sql`tier_code = ${code}`;

/**
 * The tourney at which a player played their nth distinct event (any tier),
 * optionally counting only events where they declared `faction`.
 */
function nthEvent(n: number, faction?: Faction): AchievementRule {
  const factionFilter = faction ? sql`AND faction_code = ${faction}` : sql``;
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player_id, tourney_id, date,
        row_number() OVER (PARTITION BY player_id ORDER BY date, tourney_id) AS n
      FROM (
        SELECT DISTINCT player_id, tourney_id, date
        FROM (${RESULTS}) results
        WHERE player_id IS NOT NULL ${factionFilter}
      ) events
    ) numbered
    WHERE n = ${n}
  `);
}

/**
 * The tourney at which a player first declared their nth distinct faction.
 * `"all"` means every faction in the faction table.
 */
function nthFaction(n: number | "all"): AchievementRule {
  const target =
    n === "all" ? sql`(SELECT count(*) FROM faction)` : sql`${n}`;
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player_id, tourney_id, date,
        row_number() OVER (PARTITION BY player_id ORDER BY date, tourney_id, faction_code) AS n
      FROM (
        SELECT DISTINCT ON (player_id, faction_code) player_id, faction_code, tourney_id, date
        FROM (${RESULTS}) results
        WHERE player_id IS NOT NULL
        ORDER BY player_id, faction_code, date, tourney_id
      ) first_declarations
    ) numbered
    WHERE n = ${target}
  `);
}

/**
 * The tourney at which a player first played at their nth distinct venue.
 * Tourneys without a venue don't count.
 */
function nthVenue(n: number): AchievementRule {
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player_id, tourney_id, date,
        row_number() OVER (PARTITION BY player_id ORDER BY date, tourney_id, venue_id) AS n
      FROM (
        SELECT DISTINCT ON (player_id, venue_id) player_id, venue_id, tourney_id, date
        FROM (${RESULTS}) results
        WHERE player_id IS NOT NULL AND venue_id IS NOT NULL
        ORDER BY player_id, venue_id, date, tourney_id
      ) first_visits
    ) numbered
    WHERE n = ${n}
  `);
}

/**
 * The tourney at which a player completed a "big year": a Nationals and three
 * GTs within one calendar year. The award lands on whichever of those came
 * last, in the earliest year it happened.
 */
function bigYear(): AchievementRule {
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player_id, tourney_id, date,
        count(*) OVER (PARTITION BY player_id, year) AS milestones,
        row_number() OVER (PARTITION BY player_id, year ORDER BY date DESC, tourney_id DESC) AS latest
      FROM (
        SELECT player_id, tourney_id, date, tier_code,
          extract(year FROM date) AS year,
          row_number() OVER (
            PARTITION BY player_id, extract(year FROM date), tier_code
            ORDER BY date, tourney_id
          ) AS n
        FROM (
          SELECT DISTINCT player_id, tourney_id, date, tier_code
          FROM (${RESULTS}) results
          WHERE player_id IS NOT NULL AND tier_code IN ('GT', 'NATIONALS')
        ) events
      ) numbered
      WHERE (tier_code = 'NATIONALS' AND n = 1) OR (tier_code = 'GT' AND n = 3)
    ) milestones
    WHERE milestones = 2 AND latest = 1
  `);
}

/** Every painting placing with its player and tourney. */
const PAINTING = sql`
  SELECT
    player_identity.player_id,
    painting_category.tourney_id,
    tourney.date,
    coalesce(tourney.tier_code, 'EVENT') AS tier_code,
    painting_winner.position,
    painting_winner.id AS painting_winner_id
  FROM painting_winner
  JOIN painting_category ON painting_category.id = painting_winner.category_id
  JOIN tourney ON tourney.id = painting_category.tourney_id
  JOIN player_identity ON player_identity.id = painting_winner.player_identity_id
`;

/** First painting placing matching `condition` (columns of PAINTING). */
function firstPaintingWhere(condition: RawBuilder<unknown>): AchievementRule {
  return earliest(sql`SELECT * FROM (${PAINTING}) painting WHERE ${condition}`);
}

/**
 * The tourney at which a player won their nth best painted. Each category won
 * counts, so winning two categories at one event counts twice.
 */
function nthBestPainted(n: number): AchievementRule {
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player_id, tourney_id, date,
        row_number() OVER (PARTITION BY player_id ORDER BY date, tourney_id, painting_winner_id) AS n
      FROM (${PAINTING}) painting
      WHERE player_id IS NOT NULL AND position = 1
    ) numbered
    WHERE n = ${n}
  `);
}

/**
 * The nth event a player organised (any tier), matching the tourney's
 * organiser to the player's Discord id.
 */
function nthOrganised(n: number): AchievementRule {
  return earliest(sql`
    SELECT player_id, tourney_id, date
    FROM (
      SELECT player.id AS player_id, tourney.id AS tourney_id, tourney.date,
        row_number() OVER (PARTITION BY player.id ORDER BY tourney.date, tourney.id) AS n
      FROM tourney
      JOIN player ON player.discord_id = tourney.organiser_discord_id
    ) numbered
    WHERE n = ${n}
  `);
}

/**
 * Per-faction achievements, e.g. RESSERS_PODIUM. Ids use the faction's
 * name_code; the rows are seeded for every faction by V095.
 */
function factionRules(faction: Faction): Record<string, AchievementRule> {
  const declared = sql`faction_code = ${faction}`;
  return {
    [`${faction}_FIRST_EVENT`]: nthEvent(1, faction),
    [`${faction}_FIVE_EVENTS`]: nthEvent(5, faction),
    [`${faction}_TEN_EVENTS`]: nthEvent(10, faction),
    [`${faction}_BEST_IN_FACTION`]: firstResultWhere(
      sql`${declared} AND is_best_in_faction`,
    ),
    // Any tier.
    [`${faction}_PODIUM`]: firstResultWhere(sql`${declared} AND place <= 3`),
    [`${faction}_WINNER`]: firstResultWhere(sql`${declared} AND place = 1`),
  };
}

/**
 * Rule per achievement id. Every id here must have a matching `achievement`
 * row (seeded by migration) — syncAchievements enforces this. Achievement rows
 * without a rule yet are listed on the site but never awarded.
 */
export const ACHIEVEMENT_RULES: Record<string, AchievementRule> = {
  // Event counts include every tier.
  FIRST_EVENT: nthEvent(1),
  SECOND_EVENT: nthEvent(2),
  FIVE_EVENTS: nthEvent(5),
  TEN_EVENTS: nthEvent(10),
  TWENTY_EVENTS: nthEvent(20),
  FIFTY_EVENTS: nthEvent(50),
  HUNDRED_EVENTS: nthEvent(100),

  FIRST_GT: firstResultWhere(tier("GT")),
  FIRST_NATIONALS: firstResultWhere(tier("NATIONALS")),

  // Places are unique (tiebreakers), so exactly one player comes last. A
  // one-player event's winner isn't also given the spoon.
  WOODEN_SPOON: firstResultWhere(sql`is_last AND place > 1`),
  // Highest placed player declaring each faction, even if they were the only one.
  BEST_IN_FACTION: firstResultWhere(sql`is_best_in_faction`),
  ASTBURYS_DREAM: firstResultWhere(
    sql`is_last AND place > 1 AND is_best_in_faction`,
  ),

  // PODIUM_EVENT / WIN_EVENT are EVENT tier only.
  PODIUM_EVENT: firstResultWhere(sql`place <= 3 AND ${tier("EVENT")}`),
  PODIUM_GT: firstResultWhere(sql`place <= 3 AND ${tier("GT")}`),
  PODIUM_NATIONALS: firstResultWhere(sql`place <= 3 AND ${tier("NATIONALS")}`),
  WIN_EVENT: firstResultWhere(sql`place = 1 AND ${tier("EVENT")}`),
  WIN_GT: firstResultWhere(sql`place = 1 AND ${tier("GT")}`),
  WIN_NATIONALS: firstResultWhere(sql`place = 1 AND ${tier("NATIONALS")}`),

  DIFFERENT_FACTION: nthFaction(2),
  HALF_RAINBOW: nthFaction(4),
  RAINBOW: nthFaction("all"),

  BIG_YEAR: bigYear(),
  WANDERER: nthVenue(5),

  // Painting: a win in any category counts as best painted.
  BEST_PAINTED: firstPaintingWhere(sql`position = 1`),
  BEST_PAINTED_GT: firstPaintingWhere(sql`position = 1 AND ${tier("GT")}`),
  BEST_PAINTED_NATIONALS: firstPaintingWhere(sql`position = 1 AND ${tier("NATIONALS")}`),
  PODIUM_PAINTER_NATIONALS: firstPaintingWhere(sql`position <= 3 AND ${tier("NATIONALS")}`),
  FIVE_BEST_PAINTED: nthBestPainted(5),
  TEN_BEST_PAINTED: nthBestPainted(10),

  FIRST_TO: nthOrganised(1),
  SECOND_TO: nthOrganised(2),
  FIVE_TO: nthOrganised(5),
  TEN_TO: nthOrganised(10),

  ...Object.fromEntries(
    Object.values(Faction).flatMap((f) => Object.entries(factionRules(f))),
  ),
};
