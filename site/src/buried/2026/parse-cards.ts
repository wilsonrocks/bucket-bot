import type { BuriedEvent, BuriedFaction, Card, CardKey, PaintingAward } from './cards'

/**
 * Turns the stored JSONB into cards the deck can render. Anything malformed
 * — an unknown key, a missing field, a wrong type — is dropped silently, so a
 * bad card means one fewer card rather than an error page.
 */

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const optional = <T>(v: unknown, guard: (x: unknown) => x is T): boolean => v === undefined || guard(v)
const arrayOf = <T>(v: unknown, guard: (x: unknown) => x is T, minLength = 0): v is T[] =>
  Array.isArray(v) && v.length >= minLength && v.every(guard)

const HEX = /^#[0-9a-f]{6}$/i

const isFaction = (v: unknown): v is BuriedFaction =>
  isObj(v) && isStr(v.code) && isStr(v.name) && isStr(v.hexCode) && HEX.test(v.hexCode)

const isEvent = (v: unknown): v is BuriedEvent =>
  isObj(v) && isNum(v.id) && isStr(v.name) && isStr(v.date) && isNum(v.players) && optional(v.place, isNum)

const isAward = (a: unknown): a is PaintingAward =>
  isObj(a) &&
  isObj(a.event) &&
  isNum(a.event.id) &&
  isStr(a.event.name) &&
  isStr(a.category) &&
  isNum(a.position) &&
  optional(a.model, isStr) &&
  optional(a.paintingImageKey, isStr)

const GUARDS: { [K in CardKey]: (c: Obj) => boolean } = {
  INTRO: (c) => isStr(c.playerName) && isNum(c.eventsPlayed) && isNum(c.gamesPlayed) && isNum(c.percentile),
  MOST_PLAYED_FACTION: (c) => isFaction(c.faction) && isNum(c.events) && isNum(c.share),
  FACTIONS: (c) =>
    arrayOf(
      c.factions,
      (f): f is Obj =>
        isObj(f) && isFaction(f.faction) && isNum(f.events) && optional(f.bestPlace, isNum) && optional(f.factionRank, isNum),
      1,
    ),
  VENUES: (c) =>
    arrayOf(c.venues, (v): v is Obj => isObj(v) && isStr(v.name) && isStr(v.town) && isNum(v.events), 1) &&
    isNum(c.regions),
  BIGGEST_EVENT: (c) => isEvent(c.event),
  PODIUMS: (c) => arrayOf(c.events, isEvent, 1),
  EVENTS_WON: (c) => arrayOf(c.events, isEvent, 1),
  RANKING: (c) => isNum(c.finalRank) && isNum(c.bestRank) && isStr(c.bestRankDate) && isNum(c.totalPlayers),
  PAINTING: (c) => arrayOf(c.awards, isAward, 1),
  PAINTING_AWARD: (c) => isAward(c.award),
  ORGANISED: (c) => arrayOf(c.events, isEvent, 1) && isNum(c.playersHosted),
  ACHIEVEMENTS: (c) =>
    arrayOf(
      c.achievements,
      (a): a is Obj => isObj(a) && isStr(a.id) && isStr(a.name) && optional(a.achievementImageKey, isStr),
      1,
    ),
  SUMMARY: (c) =>
    isStr(c.playerName) &&
    [c.eventsPlayed, c.gamesPlayed, c.wins, c.podiums, c.paintingAwards, c.eventsOrganised, c.venues].every(isNum) &&
    optional(c.topFaction, isFaction) &&
    optional(c.finalRank, isNum),
}

const isKey = (k: unknown): k is CardKey => isStr(k) && Object.hasOwn(GUARDS, k)

export function parseCard(raw: unknown): Card | null {
  if (!isObj(raw) || !isKey(raw.key) || !optional(raw.imageKey, isStr)) return null
  try {
    return GUARDS[raw.key](raw) ? (raw as unknown as Card) : null
  } catch {
    return null
  }
}

/** Kinds a deck can hold more than one of. */
const REPEATABLE: ReadonlySet<CardKey> = new Set(['PAINTING_AWARD'])

/** Valid cards in their stored order, each key at most once except the repeatable kinds. */
export function parseCards(raw: unknown): Card[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<CardKey>()
  const cards: Card[] = []
  for (const item of raw) {
    const card = parseCard(item)
    if (!card || (seen.has(card.key) && !REPEATABLE.has(card.key))) continue
    seen.add(card.key)
    cards.push(card)
  }
  return cards
}
