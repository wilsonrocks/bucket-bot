import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { getDiscordClient } from "../discord-client";
import { UNSUBSCRIBE_COMMAND } from "./subscription-commands";

const DEFAULT_SITE_URL = "https://malifaux.uk";

export interface RankChange {
  discordUserId: string;
  playerId: number;
  typeName: string;
  /** null when the player was not in the previous rankings. */
  oldRank: number | null;
  /** null when the player has dropped out of the rankings. */
  newRank: number | null;
  /**
   * created_at of the newest batch reported to this user, as Postgres text so
   * it round-trips at full precision (a JS Date would lose the microseconds).
   */
  notifiedUpTo: string;
}

/**
 * For every subscriber with a linked player, the displayed ranking types where
 * their rank differs between the latest batch and the one before it. Only
 * batches newer than the subscriber's last DM (or their subscription) count,
 * so nothing is reported twice.
 */
export async function getRankChanges(db: Kysely<DB>): Promise<RankChange[]> {
  const { rows } = await sql<RankChange>`
    WITH ranked_batch AS (
      SELECT
        b.id,
        b.type_code,
        b.created_at,
        row_number() OVER (PARTITION BY b.type_code ORDER BY b.id DESC) AS rn
      FROM ranking_snapshot_batch b
      INNER JOIN ranking_snapshot_type t ON t.code = b.type_code
      WHERE t.display IS DISTINCT FROM false
    ),
    batch_pair AS (
      SELECT
        latest.type_code,
        latest.id AS latest_id,
        latest.created_at,
        prev.id AS prev_id
      FROM ranked_batch latest
      INNER JOIN ranked_batch prev
        ON prev.type_code = latest.type_code AND prev.rn = 2
      WHERE latest.rn = 1
    )
    SELECT
      s.discord_user_id AS "discordUserId",
      p.id AS "playerId",
      t.name AS "typeName",
      old_rs.rank AS "oldRank",
      new_rs.rank AS "newRank",
      (max(bp.created_at) OVER (PARTITION BY s.discord_user_id))::text AS "notifiedUpTo"
    FROM ranking_subscription s
    INNER JOIN player p ON p.discord_id = s.discord_user_id
    CROSS JOIN batch_pair bp
    INNER JOIN ranking_snapshot_type t ON t.code = bp.type_code
    LEFT JOIN ranking_snapshot new_rs
      ON new_rs.batch_id = bp.latest_id AND new_rs.player_id = p.id
    LEFT JOIN ranking_snapshot old_rs
      ON old_rs.batch_id = bp.prev_id AND old_rs.player_id = p.id
    WHERE bp.created_at > COALESCE(s.last_notified_at, s.created_at)
      AND new_rs.rank IS DISTINCT FROM old_rs.rank
    ORDER BY s.discord_user_id, t.display_order, t.code
  `.execute(db);

  return rows;
}

export function formatRankChange({
  typeName,
  oldRank,
  newRank,
}: Pick<RankChange, "typeName" | "oldRank" | "newRank">): string {
  if (oldRank === null) {
    return `You have entered the ${typeName} rankings at ${newRank}.`;
  }
  if (newRank === null) {
    return `You have dropped out of the ${typeName} rankings (you were ${oldRank}).`;
  }
  const direction = newRank > oldRank ? "down" : "up";
  return `Your ranking in ${typeName} has gone ${direction} ${Math.abs(newRank - oldRank)} from ${oldRank} to ${newRank}.`;
}

export function buildRankChangeMessage(
  changes: RankChange[],
  siteUrl: string = process.env.SITE_URL ?? DEFAULT_SITE_URL,
): string {
  return [
    ...changes.map(formatRankChange),
    "",
    `[See your rankings](${siteUrl}/player/${changes[0]!.playerId})`,
    `-# Use /${UNSUBSCRIBE_COMMAND} to stop getting these messages.`,
  ].join("\n");
}

/**
 * DMs each subscriber whose ranking changed in the latest rankings. Never
 * throws for a single user: someone with DMs closed is logged and counted as
 * failed, and the pipeline's step retry must not re-send to everyone else.
 */
export async function notifyRankingSubscribers(
  db: Kysely<DB>,
): Promise<{ sent: number; failed: number }> {
  const changes = await getRankChanges(db);
  if (changes.length === 0) return { sent: 0, failed: 0 };

  const byUser = new Map<string, RankChange[]>();
  for (const change of changes) {
    const existing = byUser.get(change.discordUserId);
    if (existing) existing.push(change);
    else byUser.set(change.discordUserId, [change]);
  }

  const discordClient = await getDiscordClient();
  let sent = 0;
  let failed = 0;

  for (const [discordUserId, userChanges] of byUser) {
    try {
      const user = await discordClient.users.fetch(discordUserId);
      await user.send(buildRankChangeMessage(userChanges));
    } catch (err) {
      failed += 1;
      console.error(`Failed to DM ranking changes to ${discordUserId}:`, err);
      continue;
    }

    await db
      .updateTable("ranking_subscription")
      .set({
        last_notified_at: sql<Date>`${userChanges[0]!.notifiedUpTo}::timestamp`,
      })
      .where("discord_user_id", "=", discordUserId)
      .execute();
    sent += 1;
  }

  return { sent, failed };
}
