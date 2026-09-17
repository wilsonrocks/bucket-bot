import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import {
  getDiscordClient,
  RANKING_REPORTER_ROLE_ID,
  UK_MALIFAUX_SERVER_ID,
} from "../../logic/discord-client.js";

export async function isRankingReporter(userId: string): Promise<boolean> {
  return (await getStaffRoles(userId)).rankingReporter;
}

export interface StaffRoles {
  rankingReporter: boolean;
  /** Can edit achievement details, but not recalculate or post them. */
  achievementAide: boolean;
}

/** Looks up the user's staff roles on the UK server in one member fetch. */
export async function getStaffRoles(userId: string): Promise<StaffRoles> {
  const client = await getDiscordClient();
  const guild = await client.guilds.fetch(UK_MALIFAUX_SERVER_ID);
  const member = await guild.members.fetch(userId);
  // Unset means nobody is an aide, rather than has("") matching nothing by luck.
  const aideRoleId = process.env.ACHIEVEMENT_AIDE_ROLE_ID;
  return {
    rankingReporter: member.roles.cache.has(RANKING_REPORTER_ROLE_ID),
    achievementAide: !!aideRoleId && member.roles.cache.has(aideRoleId),
  };
}

/** Ranking reporters and achievement aides can edit achievement details. */
export async function canEditAchievements(userId: string): Promise<boolean> {
  const { rankingReporter, achievementAide } = await getStaffRoles(userId);
  return rankingReporter || achievementAide;
}

export async function getCaptainTeamIds(userId: string, db: Kysely<DB>): Promise<number[]> {
  const rows = await db
    .selectFrom("membership")
    .innerJoin("player", "player.id", "membership.player_id")
    .select("membership.team_id")
    .where("player.discord_id", "=", userId)
    .where("membership.is_captain", "=", true)
    .where("membership.left_date", "is", null)
    .execute();

  return rows.map((r) => r.team_id!);
}

export async function canAccessTeam(userId: string, teamId: number, db: Kysely<DB>): Promise<boolean> {
  if (await isRankingReporter(userId)) return true;
  return (await getCaptainTeamIds(userId, db)).includes(teamId);
}
