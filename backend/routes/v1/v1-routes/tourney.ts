import { Context } from "koa";
import z, { ZodError } from "zod";

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
      "faction.hex_code as factionHexCode",
    ])
    .orderBy("result.place", "asc")
    .execute();

  const tourneyInfoPromise = ctx.state.db
    .selectFrom("tourney")
    .where("tourney.id", "=", ctx.params.id)
    .selectAll()
    .executeTakeFirstOrThrow();

  const paintingCategoriesPromise = ctx.state.db
    .selectFrom("painting_category")
    .innerJoin(
      "painting_winner",
      "painting_category.id",
      "painting_winner.category_id"
    )
    .where("tourney_id", "=", ctx.params.id)
    .execute();

  const [players, tourney, paintingCategories] = await Promise.all([
    playerDataPromise,
    tourneyInfoPromise,
    paintingCategoriesPromise,
  ]);

  const formattedPaintingCategories = paintingCategories.reduce(
    (acc: any[], row: any) => {
      let category = acc.find((cat) => cat.name === row.name);
      if (!category) {
        category = { name: row.name, winners: [] };
        acc.push(category);
      }
      category.winners.push({
        player_id: row.player_id,
        position: row.position,
        model: row.model,
      });
      return acc;
    },
    []
  );

  ctx.response.body = {
    players,
    tourney,
    paintingCategories: formattedPaintingCategories,
  };
};

export const getTourneysForPlayerHandler = async (ctx: Context) => {
  const playerId = Number(ctx.params.playerId);
  if (!playerId || isNaN(playerId)) {
    ctx.throw(400, "Invalid player ID");
  }

  const results = await ctx.state.db
    .selectFrom("result")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("result.player_id", "=", playerId)
    .select([
      "tourney.id as tourneyId",
      "tourney.name as tourneyName",
      "tourney.date as tourneyDate",
      "tourney.venue as tourneyVenue",
      "tourney.tier_code as tourneyTierCode",
      "result.place as place",
      "result.points as points",
      "faction.name as factionName",
      "tourney.date as date",
    ])
    .orderBy("tourney.date", "desc")
    .execute();

  ctx.response.body = results;
};

const tourneyUpdateValidator = z.object({
  id: z.number(),
  organiserId: z.number().optional(),
  venueId: z.number().optional(),
  name: z.string(),
  rounds: z.number().int().min(1),
  days: z.number().int().min(1),
  tierCode: z.string(),
});

export const updateTourney = async (ctx: Context) => {
  console.log(ctx.request.body);
  let validatedParams;
  try {
    validatedParams = tourneyUpdateValidator.parse(ctx.request.body);
  } catch (error) {
    console.log(error);
    ctx.throw(400, (error as any as ZodError).message);
  }

  await ctx.state.db.transaction().execute(async (trx) => {
    const { id: tourneyId } = validatedParams;
    console.table(validatedParams);
    await trx
      .updateTable("tourney")
      .set({
        name: validatedParams.name,
        organiser_id: validatedParams.organiserId || null,
        venue_id: validatedParams.venueId || null,
        rounds: validatedParams.rounds,
        days: validatedParams.days,
        tier_code: validatedParams.tierCode,
      })
      .where("id", "=", tourneyId)
      .execute();
  });

  ctx.response.body = { message: "success" };
};
