import { Context } from "koa";
import z from "zod";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players";
import { extractTourneyFromLongshanksHtml } from "../../../logic/longshanks/extract-longshanks-tourney-data";
import { calculatePoints, maxPoints } from "../../../logic/points";

const otherDataValidator = z.object({
  longshanksId: z.string(),
  name: z.string(),
  location: z.string(),
  date: z.string(),
  tournamentOrganiserId: z.string().optional(),
});

export const newLongshanksEvent = async (ctx: Context) => {
  const longshanksEventId = ctx.params.id;
  if (!longshanksEventId) {
    ctx.throw(400, "Missing longshanks id query parameter");
  }

  const [players, otherData] = await Promise.all([
    (async () => {
      const standingsUrl = `https://malifaux.longshanks.org/events/detail/panel_standings.php?event=${longshanksEventId}&section=player`;
      const html = await fetch(standingsUrl);

      if (!html.ok) {
        ctx.throw(502, `Failed to fetch data from Longshanks ${standingsUrl}`);
      }

      const htmlText = await html.text();

      const playerData = extractPlayersFromLongshanksHTML(htmlText);
      return playerData;
    })(),
    (async () => {
      const otherDataUrl = `https://malifaux.longshanks.org/event/${longshanksEventId}/`;
      const html = await fetch(otherDataUrl);

      if (!html.ok) {
        ctx.throw(502, `Failed to fetch data from Longshanks ${otherDataUrl}`);
      }

      const htmlText = await html.text();
      const tourneyData = extractTourneyFromLongshanksHtml(htmlText);
      return tourneyData;
    })(),
  ]);

  const parsedOtherData = otherDataValidator.parse(otherData);

  const factions = await ctx.state.db
    .selectFrom("faction")
    .selectAll()
    .execute();

  const factionMap: Record<string, string> = {};

  factions.forEach((faction) => {
    factionMap[faction.longshanks_html_name] = faction.name_code;
  });

  await ctx.state.db.transaction().execute(async (trx) => {
    // first check if it already exists

    const alreadyExistingTourney = await trx
      .selectFrom("tourney")
      .where("longshanks_id", "=", parsedOtherData.longshanksId)
      .select("id")
      .executeTakeFirst();

    if (alreadyExistingTourney) {
      ctx.throw(
        400,
        `Tourney with longshanks id ${parsedOtherData.longshanksId} already exists with id ${alreadyExistingTourney.id}`,
      );
    }
    const tourney = await trx
      .insertInto("tourney")
      .values({
        // TODO add in organiser_id which is a foreign key to player table
        longshanks_id: parsedOtherData.longshanksId,
        name: parsedOtherData.name,
        venue: parsedOtherData.location,
        date: new Date(parsedOtherData.date),
        number_of_players: players.length,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await Promise.all(
      players.map(async (longshanksPlayer) => {
        // check faction is valid
        const faction_code = factionMap[longshanksPlayer.faction];
        if (!faction_code) {
          throw new Error(
            `Can't derive faction code for ${longshanksPlayer.faction}`,
          );
        }

        // do we already have a longshanks player identity for this ID?
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
          maxPoints("Local", Math.max(...players.map((x) => x.roundsPlayed))), // TODO not hard code to local
        ).points[longshanksPlayer.rank - 1];

        if (!points)
          ctx.throw(400, "Not enough players to award points/rankings");

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

  const tourney = await ctx.state.db
    .selectFrom("tourney")
    .where("longshanks_id", "=", otherData.longshanksId)
    .select("id")
    .executeTakeFirstOrThrow();

  ctx.body = { ...otherData, players, id: tourney.id };
};
