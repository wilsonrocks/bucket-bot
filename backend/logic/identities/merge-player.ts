import type { Selectable, Transaction } from "kysely";
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
