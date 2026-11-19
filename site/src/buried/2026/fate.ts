import ramUrl from './suits/ram.svg'
import crowUrl from './suits/crow.svg'
import maskUrl from './suits/mask.svg'
import tomeUrl from './suits/tome.svg'
import jokerUrl from './suits/joker.svg'
import type { Card } from './cards'

/**
 * Every card in the deck is a card from the Fate Deck: a suit and a value
 * from 1 to 13, or the Red Joker. Mirrored in backend/logic/buried/2026/fate.ts
 * for the share images — keep them in step.
 */

export type Suit = 'RAMS' | 'CROWS' | 'MASKS' | 'TOMES' | 'RED_JOKER'

export const SUITS: Record<Suit, { name: string; icon: string; colour: string }> = {
  RAMS: { name: 'Rams', icon: ramUrl, colour: '#9e1b1b' },
  CROWS: { name: 'Crows', icon: crowUrl, colour: '#15110e' },
  MASKS: { name: 'Masks', icon: maskUrl, colour: '#5b2a86' },
  TOMES: { name: 'Tomes', icon: tomeUrl, colour: '#1f4e79' },
  RED_JOKER: { name: 'Red Joker', icon: jokerUrl, colour: '#9e1b1b' },
}

export interface Fate {
  suit: Suit
  /** 1-13; absent for the Joker. */
  value?: number
}

const value = (n: number) => Math.max(1, Math.min(13, Math.round(n)))

/**
 * Suits follow the theme — Rams for results, Masks for factions, Tomes for
 * craft and service, Crows for the journey — and the value is the card's
 * headline number where it fits, so 3 wins is the 3 of Rams.
 */
export function fateOf(card: Card): Fate {
  switch (card.key) {
    case 'INTRO': return { suit: 'CROWS', value: value(card.eventsPlayed) }
    case 'MOST_PLAYED_FACTION': return { suit: 'MASKS', value: value(card.events) }
    case 'FACTIONS': return { suit: 'MASKS', value: value(card.factions.length) }
    case 'VENUES': return { suit: 'CROWS', value: value(card.venues.length) }
    case 'BIGGEST_EVENT': return { suit: 'RAMS', value: 13 }
    case 'PODIUMS': return { suit: 'RAMS', value: value(card.events.length) }
    case 'EVENTS_WON': return { suit: 'RAMS', value: value(card.events.length) }
    // A higher card for a better rank: #1 is a 13.
    case 'RANKING': return { suit: 'RAMS', value: value(14 - card.finalRank) }
    case 'PAINTING': return { suit: 'TOMES', value: value(card.awards.length) }
    case 'ORGANISED': return { suit: 'TOMES', value: value(card.events.length) }
    case 'ACHIEVEMENTS': return { suit: 'TOMES', value: value(card.achievements.length) }
    case 'SUMMARY': return { suit: 'RED_JOKER' }
  }
}
