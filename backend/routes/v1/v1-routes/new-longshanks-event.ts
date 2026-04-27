import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players.js";
import { extractTourneyFromLongshanksHtml } from "../../../logic/longshanks/extract-longshanks-tourney-data.js";
import { calculatePoints, maxPoints } from "../../../logic/points.js";

const otherDataValidator = z.object({
  longshanksId: z.string(),
  name: z.string(),
  location: z.string(),
  date: z.string(),
  tournamentOrganiserId: z.string().optional(),
});

const ErrorSchema = z.object({ error: z.string() });

export const newLongshanksEventRoute = createRoute({
  method: "post",
  path: "/longshanks-event/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({ tierCode: z.string().optional() }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}).passthrough() } },
      description: "Longshanks event ingested",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request or event already exists",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Failed to fetch from Longshanks",
    },
  },
});

export const newLongshanksEvent: RouteHandler<typeof newLongshanksEventRoute, AppEnv> = async (c) => {
  const { id: longshanksEventId } = c.req.valid("param");
  const { tierCode } = c.req.valid("json");

  const [players, otherData] = await Promise.all([
    (async () => {
      const standingsUrl = `https://malifaux.longshanks.org/events/detail/panel_standings.php?event=${longshanksEventId}&section=player`;
      const html = await fetch(standingsUrl);
      if (!html.ok) {
        throw Object.assign(new Error(`Failed to fetch data from Longshanks ${standingsUrl}`), { status: 502 });
      }
      return extractPlayersFromLongshanksHTML(await html.text());
    })(),
    (async () => {
      const otherDataUrl = `https://malifaux.longshanks.org/event/${longshanksEventId}/`;
      const html = await fetch(otherDataUrl);
      if (!html.ok) {
        throw Object.assign(new Error(`Failed to fetch data from Longshanks ${otherDataUrl}`), { status: 502 });
      }
      return extractTourneyFromLongshanksHtml(await html.text());
    })(),
  ]);

  const parsedOtherData = otherDataValidator.parse(otherData);

  const db = c.get("db");
  const factions = await db.selectFrom("faction").selectAll().execute();
  const factionMap: Record<string, string> = {};
  factions.forEach((faction) => {
    factionMap[faction.longshanks_html_name] = faction.name_code;
  });

  await db.transaction().execute(async (trx) => {
    const alreadyExistingTourney = await trx
      .selectFrom("tourney")
      .where("longshanks_id", "=", parsedOtherData.longshanksId)
      .select("id")
      .executeTakeFirst();

    if (alreadyExistingTourney) {
      throw Object.assign(
        new Error(`Tourney with longshanks id ${parsedOtherData.longshanksId} already exists with id ${alreadyExistingTourney.id}`),
        { status: 400 },
      );
    }

    const tourney = await trx
      .insertInto("tourney")
      .values({
        longshanks_id: parsedOtherData.longshanksId,
        name: parsedOtherData.name,
        venue: parsedOtherData.location,
        date: new Date(parsedOtherData.date),
        number_of_players: players.length,
        ...(tierCode ? { tier_code: tierCode } : {}),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await Promise.all(
      players.map(async (longshanksPlayer) => {
        const faction_code = factionMap[longshanksPlayer.faction];
        if (!faction_code) {
          throw new Error(`Can't derive faction code for ${longshanksPlayer.faction}`);
        }

        let dbPlayerIdentity = await trx
          .selectFrom("player_identity")
          .where("identity_provider_id", "=", "LONGSHANKS")
          .where("external_id", "=", longshanksPlayer.longshanksId)
          .selectAll()
          .executeTakeFirst();

        if (dbPlayerIdentity === undefined) {
          dbPlayerIdentity = await trx
            .insertInto("player_identity")
            .values({
              identity_provider_id: "LONGSHANKS",
              external_id: longshanksPlayer.longshanksId,
              provider_name: longshanksPlayer.name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        }

        const points = calculatePoints(
          players.length,
          maxPoints("Local", Math.max(...players.map((x) => x.roundsPlayed))),
        ).points[longshanksPlayer.rank - 1];

        if (!points) throw new Error("Not enough players to award points/rankings");

        await trx
          .insertInto("result")
          .values({
            tourney_id: tourney.id,
            player_identity_id: dbPlayerIdentity.id,
            place: longshanksPlayer.rank,
            faction_code,
            points,
            rounds_played: longshanksPlayer.roundsPlayed,
          })
          .execute();
      }),
    );
  });

  const tourney = await db
    .selectFrom("tourney")
    .where("longshanks_id", "=", otherData.longshanksId)
    .select("id")
    .executeTakeFirstOrThrow();

  return c.json({ ...otherData, players, id: tourney.id } as any, 200);
};
