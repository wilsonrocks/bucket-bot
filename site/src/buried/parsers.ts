import type { DeckCard } from './deck'
import { parseCards as parse2026 } from './2026/parse-cards'

/** Per-year card parsers, kept apart from the faces so server code needn't import React. */
const PARSERS: Record<number, (raw: unknown) => DeckCard[]> = {
  2026: parse2026,
}

export const buriedParser = (year: number) => PARSERS[year]
