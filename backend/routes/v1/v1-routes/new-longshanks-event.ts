import { Context } from "koa";
import { parseHTML } from "linkedom";
import z from "zod";
import { calculatePoints, maxPoints } from "../../../logic/points";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players";
import { extractTourneyFromLongshanksHtml } from "../../../logic/longshanks/extract-longshanks-tourney-data";
import { allTourneys } from "./tourney";

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
  const factionMap: Record<string, number> = {};
  factions.forEach((faction) => {
    factionMap[faction.name] = faction.id;
  });

  await ctx.state.db.transaction().execute(async (trx) => {
    // first make the event

    const tourney = await trx
      .insertInto("tourney")
      .values({
        // TODO add in organiser_id which is a foreign key to player table
        longshanks_id: parsedOtherData.longshanksId,
        name: parsedOtherData.name,
        venue: parsedOtherData.location,
        date: new Date(parsedOtherData.date),
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await Promise.all(
      players.map(async (player) => {
        // upsert each player

        const dbPlayer = await trx
          .insertInto("player")
          .values({
            longshanks_id: player.longshanksId,
            name: player.name,
            longshanks_name: player.name,
          })
          .onConflict((oc) =>
            oc
              .column("longshanks_id")
              .doUpdateSet({ longshanks_name: player.name })
          )
          .returning("id")
          .executeTakeFirstOrThrow();

        const points = calculatePoints(
          players.length,
          maxPoints("Local", Math.max(...players.map((x) => x.roundsPlayed))) // TODO not hard code to local
        ).points[player.rank - 1];

        if (!points)
          ctx.throw(400, "Not enough players to award points/rankings");

        await trx
          .insertInto("result")
          .values({
            tourney_id: tourney.id,
            player_id: dbPlayer.id,
            place: player.rank,
            faction_id: factionMap[player.faction || "Unknown"] || null,
            points,
          })
          .execute();
        // then add player results
      })
    );
  });

  const tourney = await ctx.state.db
    .selectFrom("tourney")
    .where("longshanks_id", "=", otherData.longshanksId)
    .select("id")
    .executeTakeFirstOrThrow();

  ctx.body = { ...otherData, players, id: tourney.id };
};
