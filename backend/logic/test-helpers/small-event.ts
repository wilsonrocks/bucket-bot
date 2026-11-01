import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { format, subMonths } from "date-fns";
import { Faction } from "../fixtures";

export const SMALL_EVENT_ONLY_PLAYER_NAME = "Zed";

// A recent event too small to award points (see calculatePoints): Alice plays
// RESSERS alongside Zed, whose only result is this event. Every result is 0
// points, so none of it should reach any ranking.
export async function addSmallEventToDb(db: Kysely<DB>) {
  const tourney = await db
    .insertInto("tourney")
    .values({
      name: "Small Event (no points)",
      date: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
      number_of_players: 2,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  const zed = await db
    .insertInto("player")
    .values({ name: SMALL_EVENT_ONLY_PLAYER_NAME })
    .returning("id")
    .executeTakeFirstOrThrow();

  const zedIdentity = await db
    .insertInto("player_identity")
    .values({
      identity_provider_id: "LONGSHANKS",
      player_id: zed.id,
      external_id: "LS-ZED",
      provider_name: SMALL_EVENT_ONLY_PLAYER_NAME,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  const aliceIdentity = await db
    .selectFrom("player_identity")
    .innerJoin("player", "player.id", "player_identity.player_id")
    .where("player.name", "=", "Alice")
    .select("player_identity.id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("result")
    .values([
      { tourney_id: tourney.id, player_identity_id: aliceIdentity.id, place: 1, points: 0, faction_code: Faction.RESSERS, rounds_played: 3 },
      { tourney_id: tourney.id, player_identity_id: zedIdentity.id, place: 2, points: 0, faction_code: Faction.RESSERS, rounds_played: 3 },
    ])
    .execute();

  return { tourneyId: tourney.id, zedId: zed.id };
}
