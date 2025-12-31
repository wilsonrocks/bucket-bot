import { ExpressionBuilder, Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";
import { Faction, RankingType } from "../fixtures";
import { GenerateRankingsConfig } from "./generate-rankings";
import { th } from "zod/v4/locales";

const oneYearAgoSql = sql<Date>`current_date - interval '1 year'`;
const oneYearAgo = (eb: ExpressionBuilder<DB, "tourney">) =>
  eb("tourney.date", ">=", oneYearAgoSql);

const checkRankingType = (
  rankingsType: string
): rankingsType is RankingType => {
  return Object.values(RankingType).includes(rankingsType as RankingType);
};

export const getRankingTypeWhereSql = (
  rankingsType: string,
  playersNeededToBeMastersRanked: number
) => {
  if (!checkRankingType(rankingsType)) {
    throw new Error(`Invalid rankings type: ${rankingsType}`);
  }

  switch (rankingsType) {
    case RankingType.BEST_RESSER:
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.RESSERS),
        oneYearAgo,
      ];
    case "BEST_GUILD":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.GUILD),
        oneYearAgo,
      ];
    case "BEST_ARCANIST":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.ARCANISTS),
        oneYearAgo,
      ];
    case "BEST_OUTCAST":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.OUTCASTS),
        oneYearAgo,
      ];
    case "BEST_THUNDERS":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.THUNDERS),
        oneYearAgo,
      ];
    case "BEST_NEVERBORN":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.NEVERBORN),
        oneYearAgo,
      ];
    case "BEST_BAYOU":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.BAYOU),
        oneYearAgo,
      ];
    case "BEST_EXPLORERS":
      return [
        (eb: ExpressionBuilder<DB, "faction">) =>
          eb(eb.ref("faction.name_code"), "=", Faction.EXPLORER),
        oneYearAgo,
      ];
    case "ROLLING_YEAR":
      return [oneYearAgo];
    case "MASTERS":
      return [
        (eb: ExpressionBuilder<DB, "tourney">) =>
          eb("tourney.number_of_players", ">=", playersNeededToBeMastersRanked),
        oneYearAgo,
      ];
    case RankingType.BEST_FOREVER:
      return [
        (eb: ExpressionBuilder<DB, "tourney">) =>
          eb(sql.lit<number>(1), "=", sql.lit<number>(2)),
      ];
  }
};

export const shouldGenerateRankings = async (
  rankingsType: string,
  db: Kysely<DB>
): Promise<boolean> => {
  const rankingSnapshotType = await db
    .selectFrom("ranking_snapshot_type")
    .where("code", "=", rankingsType)
    .selectAll()
    .executeTakeFirst();

  if (!rankingSnapshotType) {
    throw new Error(`Invalid rankings type: ${rankingsType}`);
  }

  return !!rankingSnapshotType.generate;
};
