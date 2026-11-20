import type { BuriedEvent, BuriedFaction, Card, PaintingAward } from "./cards";
import type { PlayerRow, ResultRow, YearData } from "./queries";

/** A card before its share image has been rendered. */
export type CardData = Card extends infer C ? (C extends Card ? Omit<C, "imageKey"> : never) : never;

const groupBy = <T>(rows: T[], key: (row: T) => number) => {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const k = key(row);
    const existing = map.get(k);
    if (existing) existing.push(row);
    else map.set(k, [row]);
  }
  return map;
};

const toEvent = (r: ResultRow): BuriedEvent => ({
  id: r.eventId,
  name: r.eventName,
  date: r.date,
  players: r.players,
  ...(r.place !== null ? { place: r.place } : {}),
});

/**
 * Share of players who played in strictly fewer events, 0-100, rounded down so
 * nobody is told they beat 100% of a field they're part of.
 */
export function percentileOf(value: number, all: number[]): number {
  if (all.length === 0) return 0;
  const fewer = all.filter((v) => v < value).length;
  return Math.floor((fewer / all.length) * 100);
}

/** Factions by events played, most first; ties go to the better best placing. */
function factionTally(results: ResultRow[]) {
  const tally = new Map<string, { faction: BuriedFaction; events: number; bestPlace?: number }>();
  for (const r of results) {
    const entry = tally.get(r.faction.code) ?? { faction: r.faction, events: 0 };
    entry.events += 1;
    if (r.place !== null && (entry.bestPlace === undefined || r.place < entry.bestPlace)) {
      entry.bestPlace = r.place;
    }
    tally.set(r.faction.code, entry);
  }
  return [...tally.values()].sort(
    (a, b) => b.events - a.events || (a.bestPlace ?? Infinity) - (b.bestPlace ?? Infinity),
  );
}

interface PlayerInputs {
  player: PlayerRow;
  results: ResultRow[];
  paintings: YearData["paintings"];
  organised: YearData["organised"];
  rankings: YearData["rankings"];
  factionRanks: Map<string, number>;
  achievements: YearData["achievements"];
  percentile: number;
}

export function buildCards(input: PlayerInputs): CardData[] {
  const { player, results, paintings, organised, rankings, factionRanks, achievements } = input;
  const cards: CardData[] = [];

  const eventsPlayed = new Set(results.map((r) => r.eventId)).size;
  const gamesPlayed = results.reduce((sum, r) => sum + r.rounds, 0);
  const factions = factionTally(results);
  const wins = results.filter((r) => r.place === 1);
  const podiums = results.filter((r) => r.place !== null && r.place <= 3);
  const top = factions[0];

  cards.push({
    key: "INTRO",
    playerName: player.name,
    eventsPlayed,
    gamesPlayed,
    percentile: input.percentile,
  });

  if (top) {
    cards.push({
      key: "MOST_PLAYED_FACTION",
      faction: top.faction,
      events: top.events,
      share: eventsPlayed === 0 ? 0 : top.events / eventsPlayed,
    });
  }

  if (factions.length > 1) {
    cards.push({
      key: "FACTIONS",
      factions: factions.map((f) => {
        const factionRank = factionRanks.get(f.faction.code);
        return {
          faction: f.faction,
          events: f.events,
          ...(f.bestPlace !== undefined ? { bestPlace: f.bestPlace } : {}),
          ...(factionRank !== undefined ? { factionRank } : {}),
        };
      }),
    });
  }

  const venues = new Map<number, { name: string; town: string; events: number; regionId: number | null }>();
  for (const r of results) {
    if (!r.venue) continue;
    const v = venues.get(r.venue.id) ?? { name: r.venue.name, town: r.venue.town, events: 0, regionId: r.venue.regionId };
    v.events += 1;
    venues.set(r.venue.id, v);
  }
  if (venues.size > 0) {
    const sorted = [...venues.values()].sort((a, b) => b.events - a.events);
    cards.push({
      key: "VENUES",
      venues: sorted.map(({ name, town, events }) => ({ name, town, events })),
      regions: new Set(sorted.flatMap((v) => (v.regionId === null ? [] : [v.regionId]))).size,
    });
  }

  const biggest = [...results].sort((a, b) => b.players - a.players)[0];
  if (biggest && eventsPlayed > 1) {
    cards.push({ key: "BIGGEST_EVENT", event: toEvent(biggest) });
  }

  // Podiums only earns its own card when it says more than the wins card would.
  if (podiums.length > wins.length) {
    cards.push({ key: "PODIUMS", events: podiums.map(toEvent) });
  }

  if (wins.length > 0) {
    cards.push({ key: "EVENTS_WON", events: wins.map(toEvent) });
  }

  const last = rankings.at(-1);
  if (last) {
    const best = rankings.reduce((b, r) => (r.rank < b.rank ? r : b));
    cards.push({
      key: "RANKING",
      finalRank: last.rank,
      bestRank: best.rank,
      bestRankDate: best.date,
      totalPlayers: last.totalPlayers,
    });
  }

  if (paintings.length > 0) {
    const awards = paintings.map(
      (p): PaintingAward => ({
        event: { id: p.eventId, name: p.eventName },
        category: p.category,
        position: p.position,
        ...(p.model ? { model: p.model } : {}),
        ...(p.imageKey ? { paintingImageKey: p.imageKey } : {}),
      }),
    );
    // A card for each placing, then the overview of them all.
    for (const award of awards) cards.push({ key: "PAINTING_AWARD", award });
    cards.push({ key: "PAINTING", awards });
  }

  if (organised.length > 0) {
    cards.push({
      key: "ORGANISED",
      events: organised.map((o) => ({ id: o.eventId, name: o.eventName, date: o.date, players: o.players })),
      playersHosted: organised.reduce((sum, o) => sum + o.players, 0),
    });
  }

  if (achievements.length > 0) {
    cards.push({
      key: "ACHIEVEMENTS",
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        ...(a.imageKey ? { achievementImageKey: a.imageKey } : {}),
      })),
    });
  }

  cards.push({
    key: "SUMMARY",
    playerName: player.name,
    eventsPlayed,
    gamesPlayed,
    wins: wins.length,
    podiums: podiums.length,
    paintingAwards: paintings.length,
    eventsOrganised: organised.length,
    venues: venues.size,
    ...(top ? { topFaction: top.faction } : {}),
    ...(last ? { finalRank: last.rank } : {}),
  });

  return cards;
}

/** Builds every player's deck from one fetch of the year's data. */
export function buildAllDecks(data: YearData): Map<number, CardData[]> {
  const results = groupBy(data.results, (r) => r.playerId);
  const paintings = groupBy(data.paintings, (r) => r.playerId);
  const organised = groupBy(data.organised, (r) => r.playerId);
  const rankings = groupBy(data.rankings, (r) => r.playerId);
  const achievements = groupBy(data.achievements, (r) => r.playerId);
  const factionRanks = new Map<number, Map<string, number>>();
  for (const f of data.factionRanks) {
    const m = factionRanks.get(f.playerId) ?? new Map<string, number>();
    m.set(f.factionCode, f.rank);
    factionRanks.set(f.playerId, m);
  }

  const eventCounts = [...results.values()].map((rs) => new Set(rs.map((r) => r.eventId)).size);

  const decks = new Map<number, CardData[]>();
  for (const player of data.players) {
    const playerResults = results.get(player.id) ?? [];
    decks.set(
      player.id,
      buildCards({
        player,
        results: playerResults,
        paintings: paintings.get(player.id) ?? [],
        organised: organised.get(player.id) ?? [],
        rankings: rankings.get(player.id) ?? [],
        factionRanks: factionRanks.get(player.id) ?? new Map(),
        achievements: achievements.get(player.id) ?? [],
        percentile: percentileOf(new Set(playerResults.map((r) => r.eventId)).size, eventCounts),
      }),
    );
  }
  return decks;
}
