import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players.js";
import { extractTourneyFromLongshanksHtml } from "../../../logic/longshanks/extract-longshanks-tourney-data.js";
import { calculatePoints, maxPoints } from "../../../logic/points.js";
import { createIdentityWithPlaceholderPlayer } from "../../../logic/identities/create-identity-with-placeholder.js";

const otherDataValidator = z.object({
  longshanksId: z.string(),
  name: z.string(),
  location: z.string(),
  date: z.string(),
  tournamentOrganiserId: z.string().optional(),
});

const ErrorSchema = z.object({ error: z.string() });

const MissingFactionsSchema = z.object({
  error: z.string(),
  missingFactions: z.array(
    z.object({
      longshanksId: z.string(),
      name: z.string(),
      // The faction name Longshanks gave, if it gave one we don't recognise
      longshanksFaction: z.string().nullable(),
    }),
  ),
  factions: z.array(z.object({ code: z.string(), name: z.string() })),
});

export const newLongshanksEventRoute = createRoute({
  method: "post",
  path: "/longshanks-event/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tierCode: z.string().optional(),
            // Longshanks player id -> faction name_code, for players whose
            // faction is missing (or unrecognised) on Longshanks
            factionOverrides: z.record(z.string(), z.string()).optional(),
          }),
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
    422: {
      content: { "application/json": { schema: MissingFactionsSchema } },
      description: "Some players have no faction; resubmit with factionOverrides",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Failed to fetch from Longshanks",
    },
  },
});

export const newLongshanksEvent: RouteHandler<typeof newLongshanksEventRoute, AppEnv> = async (c) => {
  const { id: longshanksEventId } = c.req.valid("param");
  const { tierCode, factionOverrides = {} } = c.req.valid("json");

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
  const factionCodes = new Set(factions.map((f) => f.name_code));

  for (const [longshanksId, code] of Object.entries(factionOverrides)) {
    if (!factionCodes.has(code)) {
      throw Object.assign(
        new Error(`Unknown faction code ${code} in override for player ${longshanksId}`),
        { status: 400 },
      );
    }
  }

  const factionCodeFor = (p: (typeof players)[number]) =>
    factionOverrides[p.longshanksId] ?? (p.faction ? factionMap[p.faction] : undefined);

  const missingFactions = players.filter((p) => !factionCodeFor(p));
  if (missingFactions.length > 0) {
    return c.json(
      {
        error: `No faction for ${missingFactions.map((p) => p.name).join(", ")}`,
        missingFactions: missingFactions.map((p) => ({
          longshanksId: p.longshanksId,
          name: p.name,
          longshanksFaction: p.faction ?? null,
        })),
        factions: factions.map((f) => ({ code: f.name_code, name: f.name })),
      },
      422,
    );
  }

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
        const faction_code = factionCodeFor(longshanksPlayer)!;

        let dbPlayerIdentity = await trx
          .selectFrom("player_identity")
          .where("identity_provider_id", "=", "LONGSHANKS")
          .where("external_id", "=", longshanksPlayer.longshanksId)
          .selectAll()
          .executeTakeFirst();

        if (dbPlayerIdentity === undefined) {
          dbPlayerIdentity = await createIdentityWithPlaceholderPlayer(trx, {
            providerId: "LONGSHANKS",
            externalId: longshanksPlayer.longshanksId,
            providerName: longshanksPlayer.name,
            longshanksName: longshanksPlayer.name,
          });
        }

        const points = calculatePoints(
          players.length,
          maxPoints(tierCode, Math.max(...players.map((x) => x.roundsPlayed))),
        ).points[longshanksPlayer.rank - 1];

        // Events under the minimum size are still imported, with 0 points for everyone
        if (points === undefined) {
          throw new Error(`No points entry for place ${longshanksPlayer.rank} of ${players.length}`);
        }

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
