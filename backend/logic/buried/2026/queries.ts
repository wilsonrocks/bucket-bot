import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { FACTION_RANKING_TYPE, RankingType } from "../../fixtures";
import type { BuriedWindow } from "../types";
import type { BuriedFaction } from "./cards";


export interface ResultRow {
  playerId: number;
  eventId: number;
  eventName: string;
  date: string;
  players: number;
  place: number | null;
  rounds: number;
  faction: BuriedFaction;
  venue: { id: number; name: string; town: string; regionId: number | null } | null;
}

export interface PaintingRow {
  playerId: number;
  eventId: number;
  eventName: string;
  category: string;
  position: number;
  model: string | null;
  imageKey: string | null;
}

export interface OrganisedRow {
  playerId: number;
  eventId: number;
  eventName: string;
  date: string;
  players: number;
}

export interface RankingRow {
  playerId: number;
  rank: number;
  date: string;
  totalPlayers: number;
}

export interface FactionRankRow {
  playerId: number;
  factionCode: string;
  rank: number;
}

export interface AchievementRow {
  playerId: number;
  id: string;
  name: string;
  imageKey: string | null;
}

export interface PlayerRow {
  id: number;
  name: string;
  discordId: string | null;
}

/** Everything the 2026 cards are built from, for every player at once. */
export interface YearData {
  players: PlayerRow[];
  results: ResultRow[];
  paintings: PaintingRow[];
  organised: OrganisedRow[];
  rankings: RankingRow[];
  factionRanks: FactionRankRow[];
  achievements: AchievementRow[];
}

const ymd = (column: string) => sql<string>`to_char(${sql.ref(column)}, 'YYYY-MM-DD')`;

export async function fetchYearData(db: Kysely<DB>, window: BuriedWindow): Promise<YearData> {
  const { start, end } = window;

  const inWindow = <T extends "tourney.date">(col: T) =>
    sql<boolean>`${sql.ref(col)} >= ${start}::date AND ${sql.ref(col)} < ${end}::date`;

  const [results, paintings, organised, rankings, factionRanks, achievements] =
    await Promise.all([
      db
        .selectFrom("result")
        .innerJoin("player_identity", "player_identity.id", "result.player_identity_id")
        .innerJoin("tourney", "tourney.id", "result.tourney_id")
        .innerJoin("faction", "faction.name_code", "result.faction_code")
        .leftJoin("venue", "venue.id", "tourney.venue_id")
        .where("player_identity.player_id", "is not", null)
        .where("player_identity.is_ignored", "=", false)
        .where(inWindow("tourney.date"))
        .select([
          "player_identity.player_id as playerId",
          "tourney.id as eventId",
          "tourney.name as eventName",
          ymd("tourney.date").as("date"),
          "tourney.number_of_players as players",
          "result.place",
          "result.rounds_played as rounds",
          "faction.name_code as factionCode",
          "faction.name as factionName",
          "faction.hex_code as factionHex",
          "venue.id as venueId",
          "venue.name as venueName",
          "venue.town as venueTown",
          "venue.region_id as regionId",
        ])
        .orderBy("tourney.date")
        .orderBy("tourney.id")
        .execute(),
      db
        .selectFrom("painting_winner")
        .innerJoin("painting_category", "painting_category.id", "painting_winner.category_id")
        .innerJoin("tourney", "tourney.id", "painting_category.tourney_id")
        .innerJoin("player_identity", "player_identity.id", "painting_winner.player_identity_id")
        .where("player_identity.player_id", "is not", null)
        .where("player_identity.is_ignored", "=", false)
        .where(inWindow("tourney.date"))
        .select([
          "player_identity.player_id as playerId",
          "tourney.id as eventId",
          "tourney.name as eventName",
          "painting_category.name as category",
          "painting_winner.position",
          "painting_winner.model",
          "painting_winner.image_key as imageKey",
        ])
        .orderBy("tourney.date")
        .orderBy("painting_winner.position")
        .execute(),
      db
        .selectFrom("tourney_organiser")
        .innerJoin("tourney", "tourney.id", "tourney_organiser.tourney_id")
        .innerJoin("player", "player.discord_id", "tourney_organiser.discord_user_id")
        .where(inWindow("tourney.date"))
        .select([
          "player.id as playerId",
          "tourney.id as eventId",
          "tourney.name as eventName",
          ymd("tourney.date").as("date"),
          "tourney.number_of_players as players",
        ])
        .orderBy("tourney.date")
        .execute(),
      db
        .selectFrom("ranking_snapshot")
        .innerJoin("ranking_snapshot_batch", "ranking_snapshot_batch.id", "ranking_snapshot.batch_id")
        .where("ranking_snapshot_batch.type_code", "=", RankingType.ROLLING_YEAR)
        .where("ranking_snapshot_batch.created_at", ">=", sql<Date>`${start}::date`)
        .where("ranking_snapshot_batch.created_at", "<", sql<Date>`${end}::date`)
        .select([
          "ranking_snapshot.player_id as playerId",
          "ranking_snapshot.rank",
          ymd("ranking_snapshot_batch.created_at").as("date"),
          sql<number>`count(*) over (partition by ranking_snapshot.batch_id)::int`.as("totalPlayers"),
        ])
        .orderBy("ranking_snapshot_batch.created_at")
        .execute(),
      // Rank in each faction's "Best X" ranking, from the last batch before the cutoff.
      db
        .with("last_batch", (qb) =>
          qb
            .selectFrom("ranking_snapshot_batch")
            .where("type_code", "in", Object.values(FACTION_RANKING_TYPE))
            .where("created_at", ">=", sql<Date>`${start}::date`)
            .where("created_at", "<", sql<Date>`${end}::date`)
            .distinctOn("type_code")
            .select(["id", "type_code"])
            .orderBy("type_code")
            .orderBy("created_at", "desc"),
        )
        .selectFrom("ranking_snapshot")
        .innerJoin("last_batch", "last_batch.id", "ranking_snapshot.batch_id")
        .select([
          "ranking_snapshot.player_id as playerId",
          "last_batch.type_code as typeCode",
          "ranking_snapshot.rank",
        ])
        .execute(),
      db
        .selectFrom("player_achievement")
        .innerJoin("achievement", "achievement.id", "player_achievement.achievement_id")
        .where("player_achievement.achieved_on", ">=", sql<Date>`${start}::date`)
        .where("player_achievement.achieved_on", "<", sql<Date>`${end}::date`)
        .select([
          "player_achievement.player_id as playerId",
          "achievement.id",
          "achievement.name",
          "achievement.image_key as imageKey",
        ])
        .orderBy("player_achievement.achieved_on")
        .orderBy("achievement.display_order")
        .execute(),
    ]);

  const playerIds = new Set<number>([
    ...results.map((r) => r.playerId!),
    ...organised.map((o) => o.playerId),
  ]);
  const players =
    playerIds.size === 0
      ? []
      : await db
          .selectFrom("player")
          .where("id", "in", [...playerIds])
          .select(["id", "name", "discord_id as discordId"])
          .orderBy("id")
          .execute();

  const factionByRankingType = new Map(
    Object.entries(FACTION_RANKING_TYPE).map(([faction, type]) => [type as string, faction]),
  );

  return {
    players,
    results: results.map((r) => ({
      playerId: r.playerId!,
      eventId: r.eventId,
      eventName: r.eventName,
      date: r.date,
      players: r.players,
      place: r.place,
      rounds: r.rounds,
      faction: { code: r.factionCode, name: r.factionName, hexCode: r.factionHex },
      venue:
        r.venueId === null
          ? null
          : {
              id: r.venueId,
              name: (r.venueName ?? r.venueTown!).trim(),
              town: r.venueTown!.trim(),
              regionId: r.regionId,
            },
    })),
    paintings: paintings.map((p) => ({ ...p, playerId: p.playerId! })),
    organised,
    rankings,
    factionRanks: factionRanks.flatMap((f) => {
      const factionCode = factionByRankingType.get(f.typeCode);
      return factionCode ? [{ playerId: f.playerId, factionCode, rank: f.rank }] : [];
    }),
    achievements,
  };
}
