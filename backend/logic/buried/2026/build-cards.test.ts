import { describe, expect, test } from "vitest";
import { buildAllDecks, buildCards, percentileOf, type CardData } from "./build-cards";
import { readFileSync } from "fs";
import { join } from "path";
import { CardKey, cardSchema } from "./cards";
import type { ResultRow, YearData } from "./queries";

const RES = { code: "RESSERS", name: "Resurrectionists", hexCode: "#469a44" };
const GLD = { code: "GUILD", name: "Guild", hexCode: "#cf1e24" };
const VENUE_A = { id: 1, name: "Venue A", town: "Town A", regionId: 1 };
const VENUE_B = { id: 2, name: "Venue B", town: "Town B", regionId: 2 };

let nextEvent = 100;
const result = (over: Partial<ResultRow> = {}): ResultRow => ({
  playerId: 1,
  eventId: nextEvent++,
  eventName: "Event",
  date: "2026-03-01",
  players: 10,
  place: 5,
  rounds: 3,
  faction: RES,
  venue: VENUE_A,
  ...over,
});

const emptyInputs = {
  player: { id: 1, name: "Alice", discordId: null },
  results: [] as ResultRow[],
  paintings: [],
  organised: [],
  rankings: [],
  factionRanks: new Map<string, number>(),
  achievements: [],
  percentile: 0,
};

const keys = (cards: CardData[]) => cards.map((c) => c.key);
const find = <K extends CardData["key"]>(cards: CardData[], key: K) =>
  cards.find((c): c is Extract<CardData, { key: K }> => c.key === key);

describe("percentileOf", () => {
  test("counts players with strictly fewer events", () => {
    expect(percentileOf(5, [1, 2, 3, 5, 5])).toBe(60);
  });
  test("never claims 100% when you're part of the field", () => {
    expect(percentileOf(9, [1, 9])).toBe(50);
  });
  test("is 0 for an empty field", () => {
    expect(percentileOf(3, [])).toBe(0);
  });
});

describe("buildCards", () => {
  test("an organiser who didn't play still gets intro, organised and summary", () => {
    const cards = buildCards({
      ...emptyInputs,
      organised: [{ playerId: 1, eventId: 1, eventName: "My Event", date: "2026-02-01", players: 12 }],
    });
    expect(keys(cards)).toEqual(["INTRO", "ORGANISED", "SUMMARY"]);
    expect(find(cards, "ORGANISED")!.playersHosted).toBe(12);
  });

  test("leaves out cards that would be empty", () => {
    const cards = buildCards({ ...emptyInputs, results: [result()] });
    expect(keys(cards)).toEqual(["INTRO", "MOST_PLAYED_FACTION", "VENUES", "SUMMARY"]);
  });

  test("intro and summary totals", () => {
    const cards = buildCards({
      ...emptyInputs,
      results: [result({ rounds: 3, place: 1 }), result({ rounds: 5, place: 2, venue: VENUE_B })],
      percentile: 80,
    });
    expect(find(cards, "INTRO")).toMatchObject({ eventsPlayed: 2, gamesPlayed: 8, percentile: 80 });
    expect(find(cards, "SUMMARY")).toMatchObject({ eventsPlayed: 2, gamesPlayed: 8, wins: 1, podiums: 2, venues: 2 });
  });

  test("most played faction, with faction list and Best-X rank when more than one", () => {
    const cards = buildCards({
      ...emptyInputs,
      results: [result({ faction: GLD, place: 4 }), result({ faction: RES, place: 2 }), result({ faction: GLD, place: 7 })],
      factionRanks: new Map([["GUILD", 3]]),
    });
    expect(find(cards, "MOST_PLAYED_FACTION")).toMatchObject({ faction: GLD, events: 2 });
    expect(find(cards, "MOST_PLAYED_FACTION")!.share).toBeCloseTo(2 / 3);
    expect(find(cards, "FACTIONS")!.factions).toEqual([
      { faction: GLD, events: 2, bestPlace: 4, factionRank: 3 },
      { faction: RES, events: 1, bestPlace: 2 },
    ]);
  });

  test("podiums card only when there are podiums beyond the wins", () => {
    const winsOnly = buildCards({ ...emptyInputs, results: [result({ place: 1 })] });
    expect(keys(winsOnly)).toContain("EVENTS_WON");
    expect(keys(winsOnly)).not.toContain("PODIUMS");

    const both = buildCards({ ...emptyInputs, results: [result({ place: 1 }), result({ place: 3 }), result({ place: 4 })] });
    expect(find(both, "PODIUMS")!.events.map((e) => e.place)).toEqual([1, 3]);
    expect(find(both, "EVENTS_WON")!.events).toHaveLength(1);
  });

  test("ranking: final is the last snapshot, best is the lowest rank", () => {
    const cards = buildCards({
      ...emptyInputs,
      results: [result()],
      rankings: [
        { playerId: 1, rank: 10, date: "2026-02-01", totalPlayers: 50 },
        { playerId: 1, rank: 4, date: "2026-06-01", totalPlayers: 60 },
        { playerId: 1, rank: 7, date: "2026-11-01", totalPlayers: 70 },
      ],
    });
    expect(find(cards, "RANKING")).toEqual({
      key: "RANKING",
      finalRank: 7,
      bestRank: 4,
      bestRankDate: "2026-06-01",
      totalPlayers: 70,
    });
  });

  test("biggest event needs more than one event", () => {
    expect(keys(buildCards({ ...emptyInputs, results: [result()] }))).not.toContain("BIGGEST_EVENT");
    const cards = buildCards({ ...emptyInputs, results: [result({ players: 8 }), result({ players: 40, eventName: "Nationals" })] });
    expect(find(cards, "BIGGEST_EVENT")!.event).toMatchObject({ name: "Nationals", players: 40 });
  });

  test("painting and achievements omit missing optional fields", () => {
    const cards = buildCards({
      ...emptyInputs,
      paintings: [{ playerId: 1, eventId: 1, eventName: "E", category: "Best Painted", position: 1, model: null, imageKey: null }],
      achievements: [{ playerId: 1, id: "FIRST_BLOOD", name: "First Blood", imageKey: null }],
    });
    expect(find(cards, "PAINTING")!.awards[0]).toEqual({ event: { id: 1, name: "E" }, category: "Best Painted", position: 1 });
    expect(find(cards, "PAINTING_AWARD")!.award).toEqual({ event: { id: 1, name: "E" }, category: "Best Painted", position: 1 });
    expect(find(cards, "ACHIEVEMENTS")!.achievements[0]).toEqual({ id: "FIRST_BLOOD", name: "First Blood" });
  });

  test("a card for each painting placing, in order, then the overview", () => {
    const painting = (position: number, eventName: string) => ({
      playerId: 1, eventId: position, eventName, category: "Best Painted", position, model: null, imageKey: null,
    });
    const cards = buildCards({ ...emptyInputs, paintings: [painting(1, "A"), painting(2, "B"), painting(3, "C")] });
    const awards = cards.filter((c): c is Extract<CardData, { key: "PAINTING_AWARD" }> => c.key === "PAINTING_AWARD");
    expect(awards.map((c) => [c.award.event.name, c.award.position])).toEqual([["A", 1], ["B", 2], ["C", 3]]);
    const firstAward = keys(cards).indexOf("PAINTING_AWARD");
    expect(keys(cards).slice(firstAward, firstAward + 4)).toEqual(["PAINTING_AWARD", "PAINTING_AWARD", "PAINTING_AWARD", "PAINTING"]);
    expect(find(cards, "PAINTING")!.awards).toHaveLength(3);
  });

  test("no painting cards without placings", () => {
    expect(keys(buildCards(emptyInputs))).not.toContain("PAINTING_AWARD");
    expect(keys(buildCards(emptyInputs))).not.toContain("PAINTING");
  });

  test("every card it builds passes the schema", () => {
    const cards = buildCards({
      ...emptyInputs,
      results: [result({ place: 1 }), result({ place: 2, faction: GLD, venue: null }), result({ place: null })],
      rankings: [{ playerId: 1, rank: 3, date: "2026-05-01", totalPlayers: 40 }],
      paintings: [{ playerId: 1, eventId: 1, eventName: "E", category: "Best Painted", position: 1, model: "Seamus", imageKey: "painting/abc" }],
      organised: [{ playerId: 1, eventId: 1, eventName: "E", date: "2026-02-01", players: 12 }],
      achievements: [{ playerId: 1, id: "X", name: "X", imageKey: "achievement/x" }],
    });
    expect(cards).toHaveLength(13);
    for (const card of cards) expect(cardSchema.safeParse(card).success, card.key).toBe(true);
  });
});

describe("buildAllDecks", () => {
  test("percentile is relative to everyone who played", () => {
    const data: YearData = {
      players: [
        { id: 1, name: "One", discordId: null },
        { id: 2, name: "Two", discordId: null },
        { id: 3, name: "Organiser", discordId: null },
      ],
      results: [result({ playerId: 1 }), result({ playerId: 1 }), result({ playerId: 2 })],
      paintings: [],
      organised: [{ playerId: 3, eventId: 1, eventName: "E", date: "2026-01-01", players: 5 }],
      rankings: [],
      factionRanks: [{ playerId: 1, factionCode: "RESSERS", rank: 2 }],
      achievements: [],
    };
    const decks = buildAllDecks(data);
    const intro = (id: number) => decks.get(id)!.find((c) => c.key === "INTRO") as Extract<CardData, { key: "INTRO" }>;
    expect(intro(1).percentile).toBe(50);
    expect(intro(2).percentile).toBe(0);
    expect(intro(3).eventsPlayed).toBe(0);
  });
});

describe("site contract", () => {
  test("the site's fixture deck passes the backend schema", () => {
    const path = join(__dirname, "../../../../site/src/buried/2026/fixture.json");
    const fixture = JSON.parse(readFileSync(path, "utf8")) as { key: string }[];
    // One of every card kind, so a new kind can't skip the contract.
    expect([...new Set(fixture.map((c) => c.key))].sort()).toEqual(Object.values(CardKey).sort());
    for (const card of fixture) expect(cardSchema.safeParse(card).success, card.key).toBe(true);
  });
});
