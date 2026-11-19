import { describe, expect, it } from 'vitest'
import fixture from './fixture.json'
import { cornerSuits, FATE_SUITS, fateOf } from './fate'
import { parseCards } from './parse-cards'

const cards = parseCards(fixture)
const card = (key: string) => cards.find((c) => c.key === key)!

describe('fateOf', () => {
  it('the value is the big number on the card', () => {
    for (const c of cards) {
      const fate = fateOf(c)
      if (fate.suit === 'RED_JOKER') expect(fate.value).toBeUndefined()
      else expect(fate.value).toBeGreaterThanOrEqual(0)
    }
    const intro = card('INTRO') as Extract<(typeof cards)[number], { key: 'INTRO' }>
    expect(fateOf(intro)).toEqual({ suit: 'CROWS', value: intro.gamesPlayed })
    expect(fateOf(card('PAINTING'))).toEqual({ suit: 'TOMES', value: 2 })
  })

  it('a rank is its own number', () => {
    const ranking = card('RANKING') as Extract<(typeof cards)[number], { key: 'RANKING' }>
    expect(fateOf({ ...ranking, finalRank: 1 }).value).toBe(1)
    expect(fateOf({ ...ranking, finalRank: 42 }).value).toBe(42)
  })

  it('does not cap big numbers', () => {
    const big = card('BIGGEST_EVENT') as Extract<(typeof cards)[number], { key: 'BIGGEST_EVENT' }>
    expect(fateOf(big).value).toBe(big.event.players)
  })

  it('the Red Joker carries every suit, the Black Joker none', () => {
    expect(cornerSuits('RED_JOKER')).toEqual(FATE_SUITS)
    expect(cornerSuits('BLACK_JOKER')).toEqual([])
    expect(cornerSuits('TOMES')).toEqual(['TOMES'])
  })

  it('the summary is the Red Joker', () => {
    expect(fateOf(card('SUMMARY'))).toEqual({ suit: 'RED_JOKER' })
  })
})
