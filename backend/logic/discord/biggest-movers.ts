import { Kysely } from "kysely";
import { DB } from "kysely-codegen";

export const BIGGEST_MOVERS_COUNT = 5;

export type Mover = {
  player_id: number;
  name: string;
  rank: number;
  rank_change: number;
  discord_user_id: string | null;
  discord_display_name: string | null;
};

// Players in the batch who climbed the most places since the previous
// snapshot. New players (no previous rank) and returning players
// (rank_change null) are excluded, as are fallers and non-movers.
export const getBiggestMovers = async (
  db: Kysely<DB>,
  batchId: number,
  limit = BIGGEST_MOVERS_COUNT,
): Promise<Mover[]> => {
  const rows = await db
    .selectFrom("ranking_snapshot")
    .innerJoin("player", "ranking_snapshot.player_id", "player.id")
    .leftJoin(
      "discord_user",
      "player.discord_id",
      "discord_user.discord_user_id",
    )
    .where("ranking_snapshot.batch_id", "=", batchId)
    .where("ranking_snapshot.new_player", "=", false)
    .where("ranking_snapshot.rank_change", "is not", null)
    .where("ranking_snapshot.rank_change", ">", 0)
    .select([
      "ranking_snapshot.player_id",
      "player.name",
      "ranking_snapshot.rank",
      "ranking_snapshot.rank_change",
      "discord_user.discord_user_id",
      "discord_user.discord_display_name",
    ] as const)
    // Ties go to the player who ended up higher.
    .orderBy("ranking_snapshot.rank_change", "desc")
    .orderBy("ranking_snapshot.rank", "asc")
    .limit(limit)
    .execute();

  return rows.map((r) => ({ ...r, rank_change: r.rank_change! }));
};

export const formatMover = (mover: Mover, displayName = `**${mover.name}**`) =>
  `${displayName} ↑${mover.rank_change} (#${mover.rank + mover.rank_change} → #${mover.rank})`;

export const formatBiggestMovers = (movers: Mover[]): string | null =>
  movers.length > 0 ? movers.map((m) => formatMover(m)).join("\n") : null;
