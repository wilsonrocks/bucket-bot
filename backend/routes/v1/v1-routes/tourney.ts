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
      "tourney.level_code",
      ctx.state.db.fn.count("result.id").as("players"),
      "tourney.longshanks_id",
    ])
    .groupBy(["tourney.id"])
    .orderBy("tourney.date", "desc")
    .execute();

  ctx.response.body = results.map((event) => {
    console.log(event);
    return {
      ...event,
      players: parseInt(event.players),
    };
  });
};
