import { Context } from "koa";
import { parseHTML } from "linkedom";
import z from "zod";

const otherDataValidator = z.object({
  longshanksId: z.string(),
  eventName: z.string(),
  location: z.string(),
  date: z.string(),
  to_longshanks_id: z.string(),
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
      let document;
      try {
        const parsed = parseHTML(htmlText);
        document = parsed.document;
      } catch (e) {
        ctx.throw(500, `Error parsing HTML from ${standingsUrl}`, { cause: e });
      }

      if (!document) {
        return ctx.throw(
          500,
          `No document found when parsing from Longshanks HTML at URL ${standingsUrl}`
        );
      }

      const players = [...document.querySelectorAll("[class=player]")].map(
        (el) => {
          const player = {
            longshanksId: el.getAttribute("id")?.split("_")[1],
            rank: parseInt(
              el.querySelector(".rank")?.textContent?.trim() ?? ""
            ),
            name: el.querySelector(".player_link")?.textContent?.trim(),
            faction: el.querySelector(".factions img")?.getAttribute("title"),
            team: el.querySelectorAll(".player_link")[1]?.textContent?.trim(),
          };
          return player;
        }
      );
      return players;
    })(),
    (async () => {
      const otherData: Record<string, unknown> = {};
      {
        const otherDataUrl = `https://malifaux.longshanks.org/event/${longshanksEventId}/`;
        const html = await fetch(otherDataUrl);

        if (!html.ok) {
          ctx.throw(
            502,
            `Failed to fetch data from Longshanks ${otherDataUrl}`
          );
        }
        const htmlText = await html.text();
        const { document } = parseHTML(htmlText);
        if (!document) {
          return ctx.throw(
            500,
            `No document found when parsing from Longshanks HTML at URL ${otherDataUrl}`
          );
        }
        otherData.longshanksId = longshanksEventId;
        otherData.eventName = document
          .querySelector(".desktop")
          ?.textContent?.trim();

        const tableCells = [...document.querySelectorAll(".details table td")];

        otherData.location = tableCells.at(-7)?.textContent?.trim();

        otherData.date = tableCells.at(-5)?.textContent?.trim().split(" ")[0];

        otherData.to_longshanks_id = tableCells
          .at(-3)
          ?.textContent?.trim()
          .split("#")
          .at(-1);
      }
      return otherData;
    })(),
  ]);

  const parsedOtherData = otherDataValidator.parse(otherData);

  console.table(parsedOtherData);
  console.table(players);

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
        name: parsedOtherData.eventName,
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
          .execute();

        await trx
          .insertInto("result")
          .values({
            tourney_id: tourney.id,
            player_id: dbPlayer[0].id,
            place: player.rank,
            faction_id: factionMap[player.faction || "Unknown"] || null,
          })
          .execute();
        // then add player results
      })
    );
  });

  ctx.body = { ...otherData, players };
};
