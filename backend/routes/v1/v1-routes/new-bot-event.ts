import { isValid, parse as parseDate } from "date-fns";
import { Context } from "koa";
import { z } from "zod";

const newBotEventValidator = z.object({
  eventId: z.string(),
  eventName: z.string(),
  organiserDiscordId: z.string(),
  venueId: z.number().nullable(),
  rounds: z.number(),
  days: z.number(),
  tier: z.string(),
  dateString: z.string(),
  results: z.array(
    z.object({
      name: z.string(),
      place: z.number(),
      played: z.number(),
      faction: z.string(),
    }),
  ),
});

export const newBotEventHandler = async (ctx: Context) => {
  let parsedData;
  try {
    const body = ctx.request.body;
    parsedData = newBotEventValidator.parse(body);
  } catch (err) {
    ctx.throw(400, `Invalid request body ${err}`);
  }

  const {
    eventId: botEventId,
    eventName,
    results,
    venueId,
    dateString,
  } = parsedData;

  await ctx.state.db.transaction().execute(async (trx) => {
    // Check if event with the same botEventId already exists
    const alreadyExistingTourney = await trx
      .selectFrom("tourney")
      .where("bot_id", "=", botEventId)
      .select("id")
      .executeTakeFirst();
    if (alreadyExistingTourney) {
      ctx.throw(400, `Event with BOT ID ${botEventId} already exists`);
    }

    const date = parseDate(dateString, "EEE, MMM d yyyy", new Date());
    if (!isValid(date)) throw ctx.throw(400, `Error Parsing Event Date`);

    // Insert new tourney
    const tourney = await trx
      .insertInto("tourney")
      .values({
        bot_id: botEventId,
        name: eventName,
        venue_id: venueId,
        number_of_players: results.length,
        date,
      })
      .returningAll()
      .execute();

    throw "ROLLBACK";
  });

  ctx.response.body = {
    message: "BOT event received successfully",
    data: parsedData,
  };
};
