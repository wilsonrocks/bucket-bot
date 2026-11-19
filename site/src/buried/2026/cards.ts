/**
 * The 2026 card contract, mirrored by hand from the backend's zod schema
 * (backend/logic/buried/2026/cards.ts). site/ can't use zod (bundle size), so
 * parse-cards.ts validates these with plain guards. fixture.json is checked
 * against both sides.
 */

export interface BuriedFaction {
  code: string
  name: string
  hexCode: string
}

export interface BuriedEvent {
  id: number
  name: string
  /** yyyy-MM-dd */
  date: string
  players: number
  place?: number
}

interface Base {
  /** Share image path, relative to VITE_ASSETS_URL. */
  imageKey?: string
}

export interface IntroCard extends Base {
  key: 'INTRO'
  playerName: string
  eventsPlayed: number
  gamesPlayed: number
  percentile: number
}

export interface MostPlayedFactionCard extends Base {
  key: 'MOST_PLAYED_FACTION'
  faction: BuriedFaction
  events: number
  share: number
}

export interface FactionsCard extends Base {
  key: 'FACTIONS'
  factions: { faction: BuriedFaction; events: number; bestPlace?: number; factionRank?: number }[]
}

export interface VenuesCard extends Base {
  key: 'VENUES'
  venues: { name: string; town: string; events: number }[]
  regions: number
}

export interface BiggestEventCard extends Base {
  key: 'BIGGEST_EVENT'
  event: BuriedEvent
}

export interface PodiumsCard extends Base {
  key: 'PODIUMS'
  events: BuriedEvent[]
}

export interface EventsWonCard extends Base {
  key: 'EVENTS_WON'
  events: BuriedEvent[]
}

export interface RankingCard extends Base {
  key: 'RANKING'
  finalRank: number
  bestRank: number
  bestRankDate: string
  totalPlayers: number
}

export interface PaintingCard extends Base {
  key: 'PAINTING'
  awards: {
    event: { id: number; name: string }
    category: string
    position: number
    model?: string
    paintingImageKey?: string
  }[]
}

export interface OrganisedCard extends Base {
  key: 'ORGANISED'
  events: BuriedEvent[]
  playersHosted: number
}

export interface AchievementsCard extends Base {
  key: 'ACHIEVEMENTS'
  achievements: { id: string; name: string; achievementImageKey?: string }[]
}

export interface SummaryCard extends Base {
  key: 'SUMMARY'
  playerName: string
  eventsPlayed: number
  gamesPlayed: number
  wins: number
  podiums: number
  paintingAwards: number
  eventsOrganised: number
  venues: number
  topFaction?: BuriedFaction
  finalRank?: number
}

export type Card =
  | IntroCard
  | MostPlayedFactionCard
  | FactionsCard
  | VenuesCard
  | BiggestEventCard
  | PodiumsCard
  | EventsWonCard
  | RankingCard
  | PaintingCard
  | OrganisedCard
  | AchievementsCard
  | SummaryCard

export type CardKey = Card['key']
