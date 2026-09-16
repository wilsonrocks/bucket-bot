import { sql, type Selectable, type Transaction } from "kysely";
import type { DB, DiscordUser } from "kysely-codegen";

export async function mergePlaceholderIntoPlayer(
  trx: Transaction<DB>,
  fromPlayerId: number,
  intoPlayerId: number,
) {
  await trx
    .updateTable("player_identity")
    .set({ player_id: intoPlayerId })
    .where("player_id", "=", fromPlayerId)
    .execute();

  await trx
    .updateTable("membership")
    .set({ player_id: intoPlayerId })
    .where("player_id", "=", fromPlayerId)
    .execute();

  await mergePlayerAchievements(trx, fromPlayerId, intoPlayerId);

  await trx
    .deleteFrom("ranking_snapshot_event")
    .where("player_id", "=", fromPlayerId)
    .execute();

  await trx
    .deleteFrom("ranking_snapshot")
    .where("player_id", "=", fromPlayerId)
    .execute();

  await trx
    .deleteFrom("player")
    .where("id", "=", fromPlayerId)
    .execute();
}

/**
 * Links a player to a Discord user, returning the id of the player that
 * survives. Usually that's `playerId` itself — but if the Discord user already
 * belongs to a different player, `playerId` is merged into that one and
 * disappears, since `player.discord_id` is unique.
 */
export async function attachDiscordUserToPlayer(
  trx: Transaction<DB>,
  playerId: number,
  discordUser: Selectable<DiscordUser>,
): Promise<number> {
  const existingPlayer = await trx
    .selectFrom("player")
    .where("discord_id", "=", discordUser.discord_user_id)
    .select("id")
    .executeTakeFirst();

  if (existingPlayer && existingPlayer.id !== playerId) {
    await mergePlaceholderIntoPlayer(trx, playerId, existingPlayer.id);
    return existingPlayer.id;
  }

  await trx
    .updateTable("player")
    .set({
      discord_id: discordUser.discord_user_id,
      name:
        discordUser.discord_display_name ||
        discordUser.discord_username ||
        discordUser.discord_nickname ||
        "Unknown User",
    })
    .where("id", "=", playerId)
    .execute();

  return playerId;
}

/**
 * Moves achievements from one player onto another ahead of a merge. Where both
 * hold the same achievement the target keeps its row, but inherits the
 * source's announcement so nothing already posted to Discord is re-posted.
 * Which tourney the achievement is credited to is fixed up by the next sync.
 */
async function mergePlayerAchievements(
  trx: Transaction<DB>,
  fromPlayerId: number,
  intoPlayerId: number,
) {
  await sql`
    UPDATE player_achievement target
    SET discord_message_id = source.discord_message_id
    FROM player_achievement source
    WHERE target.player_id = ${intoPlayerId}
      AND source.player_id = ${fromPlayerId}
      AND source.achievement_id = target.achievement_id
      AND target.discord_message_id IS NULL
      AND source.discord_message_id IS NOT NULL
  `.execute(trx);

  await trx
    .updateTable("player_achievement")
    .set({ player_id: intoPlayerId })
    .where("player_id", "=", fromPlayerId)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom("player_achievement as target")
            .select(sql`1`.as("one"))
            .where("target.player_id", "=", intoPlayerId)
            .whereRef(
              "target.achievement_id",
              "=",
              "player_achievement.achievement_id",
            ),
        ),
      ),
    )
    .execute();

  await trx
    .deleteFrom("player_achievement")
    .where("player_id", "=", fromPlayerId)
    .execute();
}
