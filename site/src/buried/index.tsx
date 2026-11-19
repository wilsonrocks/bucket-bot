import type { ReactNode } from 'react'
import type { DeckCard } from './deck'
import { CardFace, cardTitle } from './2026/card-face'

/**
 * Each Buried year keeps its own card types, parsing (parsers.ts) and faces, so a later
 * year can change everything without breaking an earlier deck.
 */
export interface BuriedEditionView {
  renderFace: (card: DeckCard, year: number) => ReactNode
  cardTitle: (card: DeckCard) => string
}

// The casts are safe: each edition only ever sees cards its own parseCards produced.
type Edition2026Card = Parameters<typeof CardFace>[0]['card']

const EDITIONS: Record<number, BuriedEditionView> = {
  2026: {
    renderFace: (card, year) => <CardFace card={card as Edition2026Card} year={year} />,
    cardTitle: (card) => cardTitle(card as Edition2026Card),
  },
}

export const buriedEdition = (year: number): BuriedEditionView | undefined => EDITIONS[year]
