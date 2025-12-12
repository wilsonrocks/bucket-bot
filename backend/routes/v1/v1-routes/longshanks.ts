import { Context } from "koa";
import { JSDOM } from "jsdom";
export const longshanks = async (ctx: Context) => {
  const longshanksEventId = ctx.query.id;
  if (!longshanksEventId)
    ctx.throw(400, "Missing longshanks id query parameter");

  let players;

  {
    const html = await fetch(
      `https://malifaux.longshanks.org/events/detail/panel_standings.php?event=${longshanksEventId}&section=player`
    );

    if (!html.ok) ctx.throw(502, "Failed to fetch data from Longshanks");
    const htmlText = await html.text();
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;
    if (!document) return ctx.throw(500, "Failed to parse Longshanks HTML");
    `https://malifaux.longshanks.org/events/detail/panel_standings.php?event=21815&section=player`;
    players = [...document.querySelectorAll("[class=player]")].map((el) => ({
      longhanksId: el.getAttribute("id")?.split("_")[1],
      rank: parseInt(el.querySelector(".rank")?.textContent.trim()),
      name: el.querySelector(".player_link")?.textContent.trim(),
      faction: el.querySelector(".factions img")?.getAttribute("title"),
      team: el.querySelectorAll(".player_link")[1]?.textContent.trim(),
    }));
  }

  const otherData: Record<string, unknown> = {};
  {
    const html = await fetch(
      `https://malifaux.longshanks.org/event/${longshanksEventId}/`
    );

    if (!html.ok) ctx.throw(502, "Failed to fetch data from Longshanks");
    const htmlText = await html.text();
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;
    if (!document) return ctx.throw(500, "Failed to parse Longshanks HTML");
    otherData.eventName = document
      .querySelector(".desktop")
      ?.textContent.trim();

    otherData.location = document
      .querySelectorAll(".details table td")[1]
      ?.textContent.trim();

    otherData.date = document
      .querySelectorAll(".details table td")[3]
      ?.textContent.trim()
      .split(" ")[0];
  }

  ctx.body = { ...otherData, players };
};
