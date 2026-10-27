import { sql, type Kysely, type RawBuilder } from "kysely";
import type { DB } from "kysely-codegen";
import { escapeMarkdown } from "discord.js";
import { getDiscordClient } from "../discord-client";
import { UNSUBSCRIBE_COMMAND } from "./subscription-commands";
import { getSiteUrl } from "../site-url";
import { toOrdinal } from "./to-ordinal";

/** Discord's limit on the length of a single message. */
const MAX_MESSAGE_LENGTH = 2000;

/** How many places either side of the subscriber the snippet shows. */
const NEIGHBOUR_SPAN = 2;

/** A player or team near the subscriber in the latest rankings. */
export interface Neighbour {
  id: number;
  name: string;
  rank: number;
  totalPoints: number;
}

export interface RankChange {
  discordUserId: string;
  playerId: number;
  /** Set when this is a change to one of the player's teams, not the player. */
  teamId: number | null;
  teamName: string | null;
  typeName: string;
  /** null when the player/team was not in the previous rankings. */
  oldRank: number | null;
  /** null when the player/team has dropped out of the rankings. */
  newRank: number | null;
  /** The latest batch, whose rankings the neighbours come from. */
  batchId: number;
  /**
   * created_at of the newest batch reported to this user, as Postgres text so
   * it round-trips at full precision (a JS Date would lose the microseconds).
   */
  notifiedUpTo: string;
  /**
   * The subscriber's own row plus up to NEIGHBOUR_SPAN either side, in rank
   * order. Empty when they have dropped out.
   */
  neighbours: Neighbour[];
}

/**
 * For every subscriber with a linked player, the displayed ranking types where
 * their rank, or the rank of a team they are currently in, differs between the
 * latest batch and the one before it. Only batches newer than the subscriber's
 * last DM (or their subscription) count, so nothing is reported twice.
 */
export async function getRankChanges(db: Kysely<DB>): Promise<RankChange[]> {
  const { rows } = await sql<Omit<RankChange, "neighbours">>`
    WITH player_ranked_batch AS (
      SELECT
        b.id,
        b.type_code,
        b.created_at,
        row_number() OVER (PARTITION BY b.type_code ORDER BY b.id DESC) AS rn
      FROM ranking_snapshot_batch b
      INNER JOIN ranking_snapshot_type t ON t.code = b.type_code
      WHERE t.display IS DISTINCT FROM false
    ),
    player_batch_pair AS (
      SELECT
        latest.type_code,
        latest.id AS latest_id,
        latest.created_at,
        prev.id AS prev_id
      FROM player_ranked_batch latest
      INNER JOIN player_ranked_batch prev
        ON prev.type_code = latest.type_code AND prev.rn = 2
      WHERE latest.rn = 1
    ),
    team_ranked_batch AS (
      SELECT
        b.id,
        b.type_code,
        b.created_at,
        row_number() OVER (PARTITION BY b.type_code ORDER BY b.id DESC) AS rn
      FROM team_ranking_snapshot_batch b
      INNER JOIN ranking_snapshot_type t ON t.code = b.type_code
      WHERE t.display IS DISTINCT FROM false
    ),
    team_batch_pair AS (
      SELECT
        latest.type_code,
        latest.id AS latest_id,
        latest.created_at,
        prev.id AS prev_id
      FROM team_ranked_batch latest
      INNER JOIN team_ranked_batch prev
        ON prev.type_code = latest.type_code AND prev.rn = 2
      WHERE latest.rn = 1
    ),
    changes AS (
      SELECT
        s.discord_user_id,
        p.id AS player_id,
        NULL::integer AS team_id,
        NULL::text AS team_name,
        t.code,
        t.name AS type_name,
        t.display_order,
        old_rs.rank AS old_rank,
        new_rs.rank AS new_rank,
        bp.latest_id,
        bp.created_at
      FROM ranking_subscription s
      INNER JOIN player p ON p.discord_id = s.discord_user_id
      CROSS JOIN player_batch_pair bp
      INNER JOIN ranking_snapshot_type t ON t.code = bp.type_code
      LEFT JOIN ranking_snapshot new_rs
        ON new_rs.batch_id = bp.latest_id AND new_rs.player_id = p.id
      LEFT JOIN ranking_snapshot old_rs
        ON old_rs.batch_id = bp.prev_id AND old_rs.player_id = p.id
      WHERE bp.created_at > COALESCE(s.last_notified_at, s.created_at)
        AND new_rs.rank IS DISTINCT FROM old_rs.rank

      UNION ALL

      SELECT
        s.discord_user_id,
        p.id,
        tm.id,
        tm.name,
        t.code,
        t.name,
        t.display_order,
        old_ts.rank,
        new_ts.rank,
        bp.latest_id,
        bp.created_at
      FROM ranking_subscription s
      INNER JOIN player p ON p.discord_id = s.discord_user_id
      INNER JOIN membership m ON m.player_id = p.id AND m.left_date IS NULL
      INNER JOIN team tm ON tm.id = m.team_id
      CROSS JOIN team_batch_pair bp
      INNER JOIN ranking_snapshot_type t ON t.code = bp.type_code
      LEFT JOIN team_ranking_snapshot new_ts
        ON new_ts.batch_id = bp.latest_id AND new_ts.team_id = tm.id
      LEFT JOIN team_ranking_snapshot old_ts
        ON old_ts.batch_id = bp.prev_id AND old_ts.team_id = tm.id
      WHERE bp.created_at > COALESCE(s.last_notified_at, s.created_at)
        AND new_ts.rank IS DISTINCT FROM old_ts.rank
    )
    SELECT
      discord_user_id AS "discordUserId",
      player_id AS "playerId",
      team_id AS "teamId",
      team_name AS "teamName",
      type_name AS "typeName",
      old_rank AS "oldRank",
      new_rank AS "newRank",
      latest_id AS "batchId",
      (max(created_at) OVER (PARTITION BY discord_user_id))::text AS "notifiedUpTo"
    FROM changes
    ORDER BY discord_user_id, team_id IS NOT NULL, team_name, display_order, code
  `.execute(db);

  const [playerNeighbours, teamNeighbours] = await Promise.all([
    getNeighbours(
      db,
      sql`
        SELECT rs.batch_id, rs.player_id AS id, p.name, rs.rank, rs.total_points
        FROM ranking_snapshot rs
        INNER JOIN player p ON p.id = rs.player_id
      `,
      rows.filter((r) => r.teamId === null && r.newRank !== null),
      (r) => r.playerId,
    ),
    getNeighbours(
      db,
      sql`
        SELECT ts.batch_id, ts.team_id AS id, tm.name, ts.rank, ts.total_points
        FROM team_ranking_snapshot ts
        INNER JOIN team tm ON tm.id = ts.team_id
      `,
      rows.filter((r) => r.teamId !== null && r.newRank !== null),
      (r) => r.teamId!,
    ),
  ]);

  return rows.map((row) => {
    const neighbours = row.teamId === null ? playerNeighbours : teamNeighbours;
    const ownId = row.teamId ?? row.playerId;
    return {
      ...row,
      neighbours: neighbours.get(`${row.batchId}:${ownId}`) ?? [],
    };
  });
}

/**
 * For each (batch, id) centre, the rows within NEIGHBOUR_SPAN positions of it
 * in that batch. Positions break rank ties by name, so a tie never widens the
 * snippet. `snapshot` must select batch_id, id, name, rank and total_points.
 */
async function getNeighbours<T extends { batchId: number }>(
  db: Kysely<DB>,
  snapshot: RawBuilder<unknown>,
  centres: T[],
  idOf: (centre: T) => number,
): Promise<Map<string, Neighbour[]>> {
  const result = new Map<string, Neighbour[]>();
  if (centres.length === 0) return result;

  const batchIds = [...new Set(centres.map((c) => c.batchId))];
  const { rows } = await sql<Neighbour & { batchId: number; centreId: number }>`
    WITH numbered AS (
      SELECT
        snap.*,
        row_number() OVER (
          PARTITION BY snap.batch_id ORDER BY snap.rank, snap.name, snap.id
        ) AS pos
      FROM (${snapshot}) snap
      WHERE snap.batch_id IN (${sql.join(batchIds)})
    )
    SELECT
      me.batch_id AS "batchId",
      me.id AS "centreId",
      n.id,
      n.name,
      n.rank,
      n.total_points AS "totalPoints"
    FROM numbered me
    INNER JOIN numbered n
      ON n.batch_id = me.batch_id
      AND n.pos BETWEEN me.pos - ${sql.lit(NEIGHBOUR_SPAN)} AND me.pos + ${sql.lit(NEIGHBOUR_SPAN)}
    WHERE (me.batch_id, me.id) IN (
      VALUES ${sql.join(centres.map((c) => sql`(${c.batchId}::integer, ${idOf(c)}::integer)`))}
    )
    ORDER BY me.batch_id, me.id, n.pos
  `.execute(db);

  for (const { batchId, centreId, ...neighbour } of rows) {
    const key = `${batchId}:${centreId}`;
    const existing = result.get(key);
    if (existing) existing.push(neighbour);
    else result.set(key, [neighbour]);
  }
  return result;
}

function describeMove(oldRank: number, newRank: number): string {
  const places = Math.abs(newRank - oldRank);
  const direction = newRank > oldRank ? "fallen" : "risen";
  return `has *${direction}* ${places} ${places === 1 ? "place" : "places"} to ${toOrdinal(newRank)}`;
}

export function formatRankChange({
  teamName,
  typeName,
  oldRank,
  newRank,
}: Pick<RankChange, "teamName" | "typeName" | "oldRank" | "newRank">): string {
  if (teamName !== null) {
    const team = `**${escapeMarkdown(teamName)}**`;
    if (oldRank === null) {
      return `${team} has entered the ${typeName} team rankings at ${toOrdinal(newRank!)}.`;
    }
    if (newRank === null) {
      return `${team} has dropped out of the ${typeName} team rankings (was ${toOrdinal(oldRank)}).`;
    }
    return `${team}'s ranking in ${typeName} ${describeMove(oldRank, newRank)}.`;
  }

  if (oldRank === null) {
    return `You have entered the ${typeName} rankings at ${toOrdinal(newRank!)}.`;
  }
  if (newRank === null) {
    return `You have dropped out of the ${typeName} rankings (you were ${toOrdinal(oldRank)}).`;
  }
  return `Your ranking in ${typeName} ${describeMove(oldRank, newRank)}.`;
}

/** The snippet of the rankings around the subscriber, as Discord quote lines. */
export function formatNeighbours(neighbours: Neighbour[], ownId: number): string[] {
  return neighbours.map(({ id, name, rank, totalPoints }) => {
    const line = `${toOrdinal(rank)} ${escapeMarkdown(name)} (${totalPoints.toFixed(2)} pts)`;
    return `> ${id === ownId ? `**${line}**` : line}`;
  });
}

/**
 * The DM for one subscriber: each change with its snippet, then links. Split
 * into several messages, between changes, when it is too long for one.
 */
export function buildRankChangeMessages(
  changes: RankChange[],
  siteUrl: string = getSiteUrl(),
): string[] {
  const blocks = changes.map((change) =>
    [
      formatRankChange(change),
      ...formatNeighbours(change.neighbours, change.teamId ?? change.playerId),
    ].join("\n"),
  );

  const teams = new Map<number, string>();
  for (const { teamId, teamName } of changes) {
    if (teamId !== null) teams.set(teamId, teamName!);
  }
  blocks.push(
    [
      `[See your rankings](${siteUrl}/player/${changes[0]!.playerId})`,
      ...[...teams].map(
        ([id, name]) => `[See ${escapeMarkdown(name)}](${siteUrl}/team/${id})`,
      ),
      `-# Use /${UNSUBSCRIBE_COMMAND} to stop getting these messages.`,
    ].join("\n"),
  );

  const messages: string[] = [];
  for (const block of blocks) {
    const last = messages.at(-1);
    if (last !== undefined && last.length + 2 + block.length <= MAX_MESSAGE_LENGTH) {
      messages[messages.length - 1] = `${last}\n\n${block}`;
    } else {
      messages.push(block);
    }
  }
  return messages;
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
      for (const message of buildRankChangeMessages(userChanges)) {
        await user.send(message);
      }
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
