import { Context } from "koa";

export const getUnmappedIdentities = async (ctx: Context) => {
  const allUnmappedPlayers = await ctx.state.db
    .selectFrom("player_identity")
    .innerJoin(
      "identity_provider",
      "player_identity.identity_provider_id",
      "identity_provider.id",
    )
    .innerJoin("result", "result.player_identity_id", "player_identity.id")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("player_identity.player_id", "is", null)
    .select([
      "player_identity.id as player_identity_id",
      "player_identity.external_id",
      "player_identity.provider_name as name",
      "identity_provider.name as provider_name",
      "identity_provider.id as provider_id",
      "result.tourney_id as tourney_id",
      "faction.name as faction_name",
      "tourney.name as tourney_name",
      "result.place as tourney_place",
    ])
    .execute();

  const grouped = new Map();

  for (const row of allUnmappedPlayers) {
    if (!grouped.has(row.player_identity_id)) {
      grouped.set(row.player_identity_id, {
        player_identity_id: row.player_identity_id,
        external_id: row.external_id,
        name: row.name,
        provider_name: row.provider_name,
        provider_id: row.provider_id,
        results: [],
      });
    }
    grouped.get(row.player_identity_id).results.push({
      tourney_id: row.tourney_id,
      tourney_name: row.tourney_name,
      place: row.tourney_place,
      faction: row.faction_name,
    });
  }
  ctx.response.body = Array.from(grouped.values());
};
