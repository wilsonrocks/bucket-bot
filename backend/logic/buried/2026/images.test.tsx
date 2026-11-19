import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { renderPng } from "../render";
import type { CardData } from "./build-cards";
import { CARD_HEIGHT, CARD_WIDTH, CardImage, OG_HEIGHT, OG_WIDTH, ordinal, SummaryOgImage, textOn } from "./images";

const ctx = { year: 2026, playerName: "Alice" };

describe("textOn", () => {
  test("dark text on light factions, white on dark", () => {
    expect(textOn("#cdae1c")).not.toBe("#ffffff"); // Outcasts yellow
    expect(textOn("#8558a5")).toBe("#ffffff"); // Neverborn purple
  });
  test("falls back for junk", () => {
    expect(textOn("not a colour")).toMatch(/^#/);
  });
});

describe("ordinal", () => {
  test.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [102, "102nd"],
  ])("%i → %s", (n, s) => expect(ordinal(n)).toBe(s));
});

describe("rendering", () => {
  const summary: Extract<CardData, { key: "SUMMARY" }> = {
    key: "SUMMARY",
    playerName: "Alice",
    eventsPlayed: 4,
    gamesPlayed: 13,
    wins: 1,
    podiums: 2,
    paintingAwards: 0,
    eventsOrganised: 0,
    venues: 2,
    topFaction: { code: "GUILD", name: "Guild", hexCode: "#cf1e24" },
    finalRank: 12,
  };

  test("a card renders to a 1080×1350 PNG", async () => {
    const png = await renderPng(<CardImage card={summary} ctx={ctx} />, CARD_WIDTH, CARD_HEIGHT);
    expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: 1080, height: 1350 });
  }, 30_000);

  test("the link preview renders to 1200×630", async () => {
    const png = await renderPng(<SummaryOgImage card={summary} ctx={ctx} />, OG_WIDTH, OG_HEIGHT);
    expect(await sharp(png).metadata()).toMatchObject({ width: 1200, height: 630 });
  }, 30_000);
});
