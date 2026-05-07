import type { Transaction } from "kysely";
import type { DB } from "kysely-codegen";

export async function createIdentityWithPlaceholderPlayer(
  trx: Transaction<DB>,
  params: {
    providerId: string;
    externalId: string;
    providerName: string;
    longshanksName?: string;
  },
) {
  const player = await trx
    .insertInto("player")
    .values({
      name: params.providerName,
      ...(params.longshanksName ? { longshanks_name: params.longshanksName } : {}),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return trx
    .insertInto("player_identity")
    .values({
      identity_provider_id: params.providerId,
      external_id: params.externalId,
      provider_name: params.providerName,
      player_id: player.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
