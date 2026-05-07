import type { Transaction } from "kysely";
import type { DB } from "kysely-codegen";

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
