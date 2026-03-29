import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { IdentityProvider } from "../../../logic/fixtures.js";
import { mapBotFactionToFactionCode } from "../../../logic/bot/map-bot-faction.js";
import { calculatePoints, maxPoints } from "../../../logic/points.js";

const BotApiLeagueEntrySchema = z.object({
  position: z.number(),
  name: z.string(),
  faction: z.string(),
  w: z.number(),
  d: z.number(),
  l: z.number(),
});

const BotApiResponseSchema = z.object({
  botid: z.string(),
  name: z.string(),
  date: z.string(),
  rounds: z.number(),
  location: z.string(),
  league: z.array(BotApiLeagueEntrySchema),
});

const ErrorSchema = z.object({ error: z.string() });

export const newBotEventRoute = createRoute({
  method: "post",
  path: "/bot-event/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ id: z.number() }) } },
      description: "BOT event ingested",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request or event already exists",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Failed to fetch from BOT API",
    },
  },
});

export const newBotEventHandler: RouteHandler<typeof newBotEventRoute, AppEnv> = async (c) => {
  const { id: botEventId } = c.req.valid("param");

  const apiUrl = `https://bag-o-tools.web.app/api/event/${botEventId}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw Object.assign(new Error(`Failed to fetch from BOT API: ${apiUrl}`), { status: 502 });
  }

  const apiData = BotApiResponseSchema.parse(await response.json());

  const db = c.get("db");

  await db.transaction().execute(async (trx) => {
    const alreadyExistingTourney = await trx
      .selectFrom("tourney")
      .where("bot_id", "=", apiData.botid)
      .select("id")
      .executeTakeFirst();

    if (alreadyExistingTourney) {
      throw Object.assign(
        new Error(`Event with BOT ID ${apiData.botid} already exists`),
        { status: 400 },
      );
    }

    const tourney = await trx
      .insertInto("tourney")
      .values({
        bot_id: apiData.botid,
        name: apiData.name,
        venue: apiData.location,
        date: new Date(apiData.date),
        number_of_players: apiData.league.length,
        rounds: apiData.rounds,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await Promise.all(
      apiData.league.map(async (entry) => {
        let dbPlayerIdentity = await trx
          .selectFrom("player_identity")
          .where("identity_provider_id", "=", IdentityProvider.BOT)
          .where("external_id", "=", entry.name)
          .select("id")
          .executeTakeFirst();

        if (!dbPlayerIdentity) {
          dbPlayerIdentity = await trx
            .insertInto("player_identity")
            .values({
              identity_provider_id: IdentityProvider.BOT,
              external_id: entry.name,
              provider_name: entry.name,
            })
            .returning("id")
            .executeTakeFirstOrThrow();
        }

        const points = calculatePoints(
          apiData.league.length,
          maxPoints("Local", apiData.rounds),
        ).points[entry.position - 1];

        if (!points) throw new Error("Not enough players to award points/rankings");

        await trx
          .insertInto("result")
          .values({
            tourney_id: tourney.id,
            player_identity_id: dbPlayerIdentity.id,
            place: entry.position,
            rounds_played: entry.w + entry.d + entry.l,
            faction_code: mapBotFactionToFactionCode(entry.faction),
            points,
          })
          .execute();
      }),
    );
  });

  const tourney = await db
    .selectFrom("tourney")
    .where("bot_id", "=", apiData.botid)
    .select("id")
    .executeTakeFirstOrThrow();

  return c.json({ id: tourney.id }, 200);
};
