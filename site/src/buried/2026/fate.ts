import ramUrl from './suits/ram.svg'
import crowUrl from './suits/crow.svg'
import maskUrl from './suits/mask.svg'
import tomeUrl from './suits/tome.svg'
import type { Card } from './cards'

/**
 * Every card in the deck is a card from the Fate Deck: a suit and a value,
 * or a Joker. The value is the big number on the card itself (3 wins
 * is the 3 of Rams, ranked #42 is the 42), so it can go past 13.
 * Mirrored in backend/logic/buried/2026/fate.ts for the share images — keep
 * them in step.
 */

export type FateSuit = 'RAMS' | 'CROWS' | 'MASKS' | 'TOMES'
/** Jokers have no suit of their own: the Red Joker carries all four, the Black Joker none. */
export type Joker = 'RED_JOKER' | 'BLACK_JOKER'
export type Suit = FateSuit | Joker

export const FATE_SUITS: FateSuit[] = ['RAMS', 'CROWS', 'MASKS', 'TOMES']

export const SUITS: Record<Suit, { name: string; colour: string }> = {
  RAMS: { name: 'Rams', colour: '#9e1b1b' },
  CROWS: { name: 'Crows', colour: '#15110e' },
  MASKS: { name: 'Masks', colour: '#5b2a86' },
  TOMES: { name: 'Tomes', colour: '#1f4e79' },
  RED_JOKER: { name: 'Red Joker', colour: '#9e1b1b' },
  BLACK_JOKER: { name: 'Black Joker', colour: '#15110e' },
}

export const SUIT_ICONS: Record<FateSuit, string> = { RAMS: ramUrl, CROWS: crowUrl, MASKS: maskUrl, TOMES: tomeUrl }

/** The suit icons shown in a card's corner. */
export const cornerSuits = (suit: Suit): FateSuit[] =>
  suit === 'RED_JOKER' ? FATE_SUITS : suit === 'BLACK_JOKER' ? [] : [suit]

export interface Fate {
  suit: Suit
  /** The card's headline number; absent for a Joker. */
  value?: number
}

const value = (n: number) => Math.max(0, Math.round(n))

/**
 * Suits follow the theme — Rams for results, Masks for factions, Tomes for
 * craft and service, Crows for the journey.
 */
export function fateOf(card: Card): Fate {
  switch (card.key) {
    case 'INTRO': return { suit: 'CROWS', value: value(card.gamesPlayed) }
    case 'MOST_PLAYED_FACTION': return { suit: 'MASKS', value: value(card.events) }
    case 'FACTIONS': return { suit: 'MASKS', value: value(card.factions.length) }
    case 'VENUES': return { suit: 'CROWS', value: value(card.venues.length) }
    case 'BIGGEST_EVENT': return { suit: 'RAMS', value: value(card.event.players) }
    case 'PODIUMS': return { suit: 'RAMS', value: value(card.events.length) }
    case 'EVENTS_WON': return { suit: 'RAMS', value: value(card.events.length) }
    case 'RANKING': return { suit: 'RAMS', value: value(card.finalRank) }
    case 'PAINTING': return { suit: 'TOMES', value: value(card.awards.length) }
    case 'ORGANISED': return { suit: 'TOMES', value: value(card.events.length) }
    case 'ACHIEVEMENTS': return { suit: 'TOMES', value: value(card.achievements.length) }
    case 'SUMMARY': return { suit: 'RED_JOKER' }
  }
}
