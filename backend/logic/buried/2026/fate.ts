import { readFileSync } from "fs";
import { join } from "path";
import type { CardData } from "./build-cards";

/**
 * Every card in the deck is a card from the Fate Deck: a suit and a value
 * from 1 to 13, or the Red Joker. Mirrors site/src/buried/2026/fate.ts —
 * keep them in step.
 */

export type Suit = "RAMS" | "CROWS" | "MASKS" | "TOMES" | "RED_JOKER";

const SUIT_FILES: Record<Suit, string> = {
  RAMS: "ram.svg",
  CROWS: "crow.svg",
  MASKS: "mask.svg",
  TOMES: "tome.svg",
  RED_JOKER: "joker.svg",
};

export const SUITS: Record<Suit, { name: string; colour: string }> = {
  RAMS: { name: "Rams", colour: "#9e1b1b" },
  CROWS: { name: "Crows", colour: "#15110e" },
  MASKS: { name: "Masks", colour: "#5b2a86" },
  TOMES: { name: "Tomes", colour: "#1f4e79" },
  RED_JOKER: { name: "Red Joker", colour: "#9e1b1b" },
};

const icons = new Map<Suit, string>();

/** The suit's icon as a data: URI satori can draw. */
export function suitIcon(suit: Suit): string {
  let uri = icons.get(suit);
  if (!uri) {
    const svg = readFileSync(join(__dirname, "suits", SUIT_FILES[suit]));
    uri = `data:image/svg+xml;base64,${svg.toString("base64")}`;
    icons.set(suit, uri);
  }
  return uri;
}

export interface Fate {
  suit: Suit;
  /** 1-13; absent for the Joker. */
  value?: number;
}

const value = (n: number) => Math.max(1, Math.min(13, Math.round(n)));

export function fateOf(card: CardData): Fate {
  switch (card.key) {
    case "INTRO": return { suit: "CROWS", value: value(card.eventsPlayed) };
    case "MOST_PLAYED_FACTION": return { suit: "MASKS", value: value(card.events) };
    case "FACTIONS": return { suit: "MASKS", value: value(card.factions.length) };
    case "VENUES": return { suit: "CROWS", value: value(card.venues.length) };
    case "BIGGEST_EVENT": return { suit: "RAMS", value: 13 };
    case "PODIUMS": return { suit: "RAMS", value: value(card.events.length) };
    case "EVENTS_WON": return { suit: "RAMS", value: value(card.events.length) };
    // A higher card for a better rank: #1 is a 13.
    case "RANKING": return { suit: "RAMS", value: value(14 - card.finalRank) };
    case "PAINTING": return { suit: "TOMES", value: value(card.awards.length) };
    case "ORGANISED": return { suit: "TOMES", value: value(card.events.length) };
    case "ACHIEVEMENTS": return { suit: "TOMES", value: value(card.achievements.length) };
    case "SUMMARY": return { suit: "RED_JOKER" };
  }
}
