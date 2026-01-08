import { Context } from "koa";
import { parse } from "path";

export const allTourneys = async (ctx: Context) => {
  const results = await ctx.state.db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .select([
      "tourney.id",
      "tourney.name",
      "tourney.date",
      "tourney.venue",
      "tourney.tier_code",
      ctx.state.db.fn.count("result.id").as("players"),
      "tourney.longshanks_id",
    ])
    .groupBy(["tourney.id"])
    .orderBy("tourney.date", "desc")
    .execute();

  ctx.response.body = results.map((event) => {
    return {
      ...event,
      players: parseInt(event.players as string),
    };
  });
};

export const detailTourney = async (ctx: Context) => {
  console.table(ctx.params);
  const playerDataPromise = ctx.state.db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .innerJoin("player", "result.player_id", "player.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("tourney.id", "=", ctx.params.id)
    .select([
      "player.id as playerId",
      "faction.name as factionName",
      "player.name as playerName",
      "result.place",
      "result.points",
    ])
    .orderBy("result.place", "asc")
    .execute();

  const tourneyInfoPromise = ctx.state.db
    .selectFrom("tourney")
    .where("tourney.id", "=", ctx.params.id)
    .selectAll()
    .executeTakeFirstOrThrow();

  const [players, tourney] = await Promise.all([
    playerDataPromise,
    tourneyInfoPromise,
  ]);

  ctx.response.body = { players, tourney };
};
