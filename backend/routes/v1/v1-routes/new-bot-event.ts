import { isValid, parse as parseDate } from "date-fns";
import { Context } from "koa";
import { map, z } from "zod";
import { Faction, IdentityProvider } from "../../../logic/fixtures";
import { calculatePoints, maxPoints } from "../../../logic/points";

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
      .executeTakeFirstOrThrow();

    // k so now we have a tourney, lets add the results

    await Promise.all(
      results.map(async (result) => {
        // does the player identity with the same name (what BOT uses for id) exist already

        let dbPlayerIdentity;

        dbPlayerIdentity = await trx
          .selectFrom("player_identity")
          .where("external_id", "=", result.name)
          .where("identity_provider_id", "=", "BOT")
          .select("id")
          .executeTakeFirst();

        if (!dbPlayerIdentity) {
          dbPlayerIdentity = await trx
            .insertInto("player_identity")
            .values({
              identity_provider_id: IdentityProvider.BOT,
              external_id: result.name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        }

        // now we have the player identity, let's add the result

        const points = calculatePoints(
          results.length,
          maxPoints("Local", Math.max(...results.map((x) => x.played))), // TODO not hard code to local
        ).points[result.place - 1];

        if (!points)
          ctx.throw(400, "Not enough players to award points/rankings");

        await trx
          .insertInto("result")
          .values({
            tourney_id: tourney.id,
            player_identity_id: dbPlayerIdentity.id,
            place: result.place,
            rounds_played: result.played,
            faction_code: mapBotFactionToFactionCode(result.faction),
            points,
          })

          .returningAll()
          .executeTakeFirst();
      }),
    );
  });

  ctx.response.body = {
    message: "BOT event received successfully",
    data: parsedData,
  };
};

function mapBotFactionToFactionCode(botFaction: string): Faction {
  switch (botFaction) {
    case "outcasts":
      return Faction.OUTCASTS;
    case "guild":
      return Faction.GUILD;
    case "bayou":
      return Faction.BAYOU;
    case "arcanists":
      return Faction.ARCANISTS;
    case "explorers":
      return Faction.EXPLORER;
    case "neverborn":
      return Faction.NEVERBORN;
    case "thunders":
      return Faction.THUNDERS;
    case "resurrectionists":
      return Faction.RESSERS;

    default:
      throw "UNKNOWN FACTION";
  }
}
