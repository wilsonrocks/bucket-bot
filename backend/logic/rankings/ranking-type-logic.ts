import { ExpressionBuilder, Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";
import { Faction, RankingType } from "../fixtures";

const oneYearAgoSql = sql<Date>`current_date - interval '1 year'`;
const oneYearAgo = (eb: ExpressionBuilder<DB, "tourney">) =>
  eb("tourney.date", ">=", oneYearAgoSql);

const rankingTypeWhereMap = {
  [RankingType.BEST_RESSER]: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.RESSERS),
    oneYearAgo,
  ],

  BEST_GUILD: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.GUILD),
    oneYearAgo,
  ],

  BEST_ARCANIST: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.ARCANISTS),
    oneYearAgo,
  ],

  BEST_OUTCAST: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.OUTCASTS),
    oneYearAgo,
  ],

  BEST_THUNDERS: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.THUNDERS),
    oneYearAgo,
  ],

  BEST_NEVERBORN: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.NEVERBORN),
    oneYearAgo,
  ],

  BEST_BAYOU: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.BAYOU),
    oneYearAgo,
  ],

  BEST_EXPLORERS: [
    (eb: ExpressionBuilder<DB, "faction">) =>
      eb(eb.ref("faction.name_code"), "=", Faction.EXPLORER),
    oneYearAgo,
  ],

  ROLLING_YEAR: [oneYearAgo],

  MASTERS: [
    (eb: ExpressionBuilder<DB, "tourney">) =>
      eb("tourney.number_of_players", ">=", 12),
    oneYearAgo,
  ],

  [RankingType.BEST_FOREVER]: [
    (eb: ExpressionBuilder<DB, "tourney">) =>
      eb(sql.lit<number>(1), "=", sql.lit<number>(2)), // always false condition to include no records
  ],
} as const;

const checkRankingType = (
  rankingsType: string
): rankingsType is RankingType => {
  return Object.values(RankingType).includes(rankingsType as RankingType);
};

export const getRankingTypeWhereSql = (rankingsType: string) => {
  if (!checkRankingType(rankingsType)) {
    throw new Error(`Invalid rankings type: ${rankingsType}`);
  }

  const rankingTypeWhereSql =
    rankingTypeWhereMap[rankingsType as keyof typeof rankingTypeWhereMap];

  return rankingTypeWhereSql;
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
