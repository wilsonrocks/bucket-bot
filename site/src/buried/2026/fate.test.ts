import { describe, expect, it } from 'vitest'
import fixture from './fixture.json'
import { fateOf } from './fate'
import { parseCards } from './parse-cards'

const cards = parseCards(fixture)
const card = (key: string) => cards.find((c) => c.key === key)!

describe('fateOf', () => {
  it('gives every card a value from 1 to 13, except the Joker', () => {
    for (const c of cards) {
      const fate = fateOf(c)
      if (fate.suit === 'RED_JOKER') {
        expect(fate.value).toBeUndefined()
      } else {
        expect(fate.value).toBeGreaterThanOrEqual(1)
        expect(fate.value).toBeLessThanOrEqual(13)
      }
    }
  })

  it('uses the headline number as the value', () => {
    expect(fateOf(card('INTRO'))).toEqual({ suit: 'CROWS', value: 8 })
    expect(fateOf(card('PAINTING'))).toEqual({ suit: 'TOMES', value: 2 })
  })

  it('a better rank is a higher card', () => {
    const ranking = card('RANKING') as Extract<(typeof cards)[number], { key: 'RANKING' }>
    expect(fateOf({ ...ranking, finalRank: 1 }).value).toBe(13)
    expect(fateOf({ ...ranking, finalRank: 7 }).value).toBe(7)
    expect(fateOf({ ...ranking, finalRank: 40 }).value).toBe(1)
  })

  it('caps big numbers at 13', () => {
    const intro = card('INTRO') as Extract<(typeof cards)[number], { key: 'INTRO' }>
    expect(fateOf({ ...intro, eventsPlayed: 30 }).value).toBe(13)
  })

  it('the summary is the Red Joker', () => {
    expect(fateOf(card('SUMMARY'))).toEqual({ suit: 'RED_JOKER' })
  })
})
