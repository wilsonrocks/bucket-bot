import { Context } from "koa";
import { parseHTML } from "linkedom";

export const longshanks = async (ctx: Context) => {
  const longshanksEventId = ctx.query.id;
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
            longhanksId: el.getAttribute("id")?.split("_")[1],
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
        otherData.eventName = document
          .querySelector(".desktop")
          ?.textContent?.trim();
        console.log("[longshanks] Event name:", otherData.eventName);

        otherData.location = document
          .querySelectorAll(".details table td")[1]
          ?.textContent?.trim();

        otherData.date = document
          .querySelectorAll(".details table td")[3]
          ?.textContent?.trim()
          .split(" ")[0];
      }
      return otherData;
    })(),
  ]);

  ctx.body = { ...otherData, players };
};
