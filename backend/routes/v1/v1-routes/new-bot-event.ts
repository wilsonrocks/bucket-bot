import { isValid, parse as parseDate } from "date-fns";
import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { Faction, IdentityProvider } from "../../../logic/fixtures.js";
import { calculatePoints, maxPoints } from "../../../logic/points.js";

const NewBotEventBodySchema = z.object({
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

const ErrorSchema = z.object({ error: z.string() });

export const newBotEventRoute = createRoute({
  method: "post",
  path: "/bot-event",
  request: {
    body: {
      content: { "application/json": { schema: NewBotEventBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string(), data: NewBotEventBodySchema }),
        },
      },
      description: "Bot event received successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request",
    },
  },
});

export const newBotEventHandler: RouteHandler<typeof newBotEventRoute, AppEnv> = async (c) => {
  const parsedData = c.req.valid("json");

  const {
    eventId: botEventId,
    eventName,
    results,
    venueId,
    dateString,
  } = parsedData;

  await c.get("db").transaction().execute(async (trx) => {
    const alreadyExistingTourney = await trx
      .selectFrom("tourney")
      .where("bot_id", "=", botEventId)
      .select("id")
      .executeTakeFirst();

    if (alreadyExistingTourney) {
      throw new Error(`Event with BOT ID ${botEventId} already exists`);
    }

    const date = parseDate(dateString, "EEE, MMM d yyyy", new Date());
    if (!isValid(date)) throw new Error("Error Parsing Event Date");

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

    await Promise.all(
      results.map(async (result) => {
        let dbPlayerIdentity = await trx
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
              provider_name: result.name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        }

        const points = calculatePoints(
          results.length,
          maxPoints("Local", Math.max(...results.map((x) => x.played))),
        ).points[result.place - 1];

        if (!points) throw new Error("Not enough players to award points/rankings");

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

  return c.json({ message: "BOT event received successfully", data: parsedData }, 200);
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
      throw new Error("UNKNOWN FACTION");
  }
}
