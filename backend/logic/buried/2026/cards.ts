import { z } from "zod";

/**
 * The 2026 card contract. Mirrored by hand-written guards in
 * site/src/buried/2026/parse-cards.ts — change both together (the fixture in
 * site/src/buried/2026/fixture.json is checked against this schema in
 * build-cards.test.ts).
 */

export const CardKey = {
  INTRO: "INTRO",
  MOST_PLAYED_FACTION: "MOST_PLAYED_FACTION",
  FACTIONS: "FACTIONS",
  VENUES: "VENUES",
  BIGGEST_EVENT: "BIGGEST_EVENT",
  PODIUMS: "PODIUMS",
  EVENTS_WON: "EVENTS_WON",
  RANKING: "RANKING",
  PAINTING: "PAINTING",
  /** One per painting placing; a deck can hold several, each before the PAINTING overview. */
  PAINTING_AWARD: "PAINTING_AWARD",
  ORGANISED: "ORGANISED",
  ACHIEVEMENTS: "ACHIEVEMENTS",
  SUMMARY: "SUMMARY",
} as const;
export type CardKey = (typeof CardKey)[keyof typeof CardKey];

const factionSchema = z.object({
  code: z.string(),
  name: z.string(),
  hexCode: z.string(),
});
export type BuriedFaction = z.infer<typeof factionSchema>;

const eventSchema = z.object({
  id: z.number(),
  name: z.string(),
  /** yyyy-MM-dd */
  date: z.string(),
  players: z.number(),
  place: z.number().optional(),
});
export type BuriedEvent = z.infer<typeof eventSchema>;

const base = { imageKey: z.string().optional() };

export const introCard = z.object({
  ...base,
  key: z.literal(CardKey.INTRO),
  playerName: z.string(),
  eventsPlayed: z.number(),
  gamesPlayed: z.number(),
  /** Share of active players (0-100) who played in fewer events. */
  percentile: z.number(),
});

export const mostPlayedFactionCard = z.object({
  ...base,
  key: z.literal(CardKey.MOST_PLAYED_FACTION),
  faction: factionSchema,
  events: z.number(),
  /** 0-1 share of the player's events. */
  share: z.number(),
});

export const factionsCard = z.object({
  ...base,
  key: z.literal(CardKey.FACTIONS),
  factions: z.array(
    z.object({
      faction: factionSchema,
      events: z.number(),
      bestPlace: z.number().optional(),
      /** Rank in the faction's "Best X" ranking at the cutoff. */
      factionRank: z.number().optional(),
    }),
  ),
});

export const venuesCard = z.object({
  ...base,
  key: z.literal(CardKey.VENUES),
  venues: z.array(z.object({ name: z.string(), town: z.string(), events: z.number() })),
  regions: z.number(),
});

export const biggestEventCard = z.object({
  ...base,
  key: z.literal(CardKey.BIGGEST_EVENT),
  event: eventSchema,
});

export const podiumsCard = z.object({
  ...base,
  key: z.literal(CardKey.PODIUMS),
  events: z.array(eventSchema),
});

export const eventsWonCard = z.object({
  ...base,
  key: z.literal(CardKey.EVENTS_WON),
  events: z.array(eventSchema),
});

export const rankingCard = z.object({
  ...base,
  key: z.literal(CardKey.RANKING),
  finalRank: z.number(),
  bestRank: z.number(),
  /** yyyy-MM-dd */
  bestRankDate: z.string(),
  totalPlayers: z.number(),
});

const paintingAwardSchema = z.object({
  event: z.object({ id: z.number(), name: z.string() }),
  category: z.string(),
  position: z.number(),
  model: z.string().optional(),
  paintingImageKey: z.string().optional(),
});
export type PaintingAward = z.infer<typeof paintingAwardSchema>;

export const paintingCard = z.object({
  ...base,
  key: z.literal(CardKey.PAINTING),
  awards: z.array(paintingAwardSchema),
});

export const paintingAwardCard = z.object({
  ...base,
  key: z.literal(CardKey.PAINTING_AWARD),
  award: paintingAwardSchema,
});

export const organisedCard = z.object({
  ...base,
  key: z.literal(CardKey.ORGANISED),
  events: z.array(eventSchema),
  playersHosted: z.number(),
});

export const achievementsCard = z.object({
  ...base,
  key: z.literal(CardKey.ACHIEVEMENTS),
  achievements: z.array(
    z.object({ id: z.string(), name: z.string(), achievementImageKey: z.string().optional() }),
  ),
});

export const summaryCard = z.object({
  ...base,
  key: z.literal(CardKey.SUMMARY),
  playerName: z.string(),
  eventsPlayed: z.number(),
  gamesPlayed: z.number(),
  wins: z.number(),
  podiums: z.number(),
  paintingAwards: z.number(),
  eventsOrganised: z.number(),
  venues: z.number(),
  topFaction: factionSchema.optional(),
  finalRank: z.number().optional(),
});

export const cardSchema = z.discriminatedUnion("key", [
  introCard,
  mostPlayedFactionCard,
  factionsCard,
  venuesCard,
  biggestEventCard,
  podiumsCard,
  eventsWonCard,
  rankingCard,
  paintingCard,
  paintingAwardCard,
  organisedCard,
  achievementsCard,
  summaryCard,
]);
export type Card = z.infer<typeof cardSchema>;
export type CardOf<K extends CardKey> = Extract<Card, { key: K }>;
