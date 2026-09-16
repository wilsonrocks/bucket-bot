import { sql } from "kysely";
import { dbClient } from "../../db-client";
import { ACHIEVEMENT_RULES, type AchievementRule } from "../achievements/rules";
import { Faction, IdentityProvider } from "../fixtures";

/** A subset of the real rules, so a test only sees the achievements it's about. */
export function pickRules(...ids: string[]): Record<string, AchievementRule> {
  return Object.fromEntries(ids.map((id) => [id, ACHIEVEMENT_RULES[id]!]));
}

/**
 * Tourney/player/result fixtures namespaced by `prefix`, so each test file can
 * clean up only what it created.
 */
export function makeAchievementFixtures(prefix: string) {
  async function cleanup() {
    await dbClient.deleteFrom("tourney").where("name", "like", `${prefix}%`).execute();
    await dbClient
      .deleteFrom("player_identity")
      .where("external_id", "like", `${prefix}%`)
      .execute();
    await dbClient.deleteFrom("player").where("name", "like", `${prefix}%`).execute();
  }

  async function addTourney(
    name: string,
    date: string,
    tier: "EVENT" | "GT" | "NATIONALS" = "EVENT",
  ) {
    return (
      await dbClient
        .insertInto("tourney")
        .values({ name: `${prefix}${name}`, date, number_of_players: 8, tier_code: tier })
        .returning("id")
        .executeTakeFirstOrThrow()
    ).id;
  }

  async function addIdentity(name: string, playerId: number | null) {
    return (
      await dbClient
        .insertInto("player_identity")
        .values({
          player_id: playerId,
          identity_provider_id: IdentityProvider.LONGSHANKS,
          external_id: `${prefix}${name}`,
          provider_name: name,
        })
        .returning("id")
        .executeTakeFirstOrThrow()
    ).id;
  }

  async function addPlayer(name: string) {
    const player = await dbClient
      .insertInto("player")
      .values({ name: `${prefix}${name}` })
      .returning("id")
      .executeTakeFirstOrThrow();
    const identityId = await addIdentity(name, player.id);
    return { playerId: player.id, identityId };
  }

  async function addResult(
    identityId: number,
    tourneyId: number,
    place: number,
    faction: Faction | `${Faction}` = "GUILD",
  ) {
    await dbClient
      .insertInto("result")
      .values({
        tourney_id: tourneyId,
        player_identity_id: identityId,
        place,
        points: 10,
        faction_code: faction,
        rounds_played: 3,
      })
      .execute();
  }

  async function awardsFor(playerId: number) {
    return dbClient
      .selectFrom("player_achievement")
      .where("player_id", "=", playerId)
      .select([
        "achievement_id",
        "tourney_id",
        sql<string>`to_char(achieved_on, 'YYYY-MM-DD')`.as("achieved_on"),
        "discord_message_id",
      ])
      .orderBy("achievement_id")
      .execute();
  }

  return { cleanup, addTourney, addIdentity, addPlayer, addResult, awardsFor };
}
