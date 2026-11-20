import { describe, expect, it } from 'vitest'
import { cardTitle } from './card-face'
import type { Card } from './cards'
import fixture from './fixture.json'
import { parseCards } from './parse-cards'

const cards = parseCards(fixture)

/** The fixture card for `key`, with every list cut down to its first item. */
function single(key: Card['key']): Card {
  const card = cards.find((c) => c.key === key)!
  return Object.fromEntries(Object.entries(card).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 1) : v])) as Card
}

describe('cardTitle', () => {
  it.each([
    ['FACTIONS', '1 faction'],
    ['VENUES', '1 venue'],
    ['PODIUMS', '1 podium'],
    ['EVENTS_WON', '1 event won'],
    ['PAINTING', '1 painting award'],
    ['ORGANISED', '1 event organised'],
    ['ACHIEVEMENTS', '1 achievement'],
  ] as const)('%s is singular for one', (key, title) => {
    expect(cardTitle(single(key))).toBe(title)
  })

  it('is plural for more than one', () => {
    expect(cardTitle(cards.find((c) => c.key === 'PODIUMS')!)).toBe('2 podiums')
    expect(cardTitle(cards.find((c) => c.key === 'ACHIEVEMENTS')!)).toBe('2 achievements')
  })
})
