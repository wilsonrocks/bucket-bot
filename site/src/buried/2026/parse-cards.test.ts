import { describe, expect, it } from 'vitest'
import fixture from './fixture.json'
import { parseCard, parseCards } from './parse-cards'

const intro = { key: 'INTRO', playerName: 'A', eventsPlayed: 1, gamesPlayed: 3, percentile: 10 }

describe('parseCards', () => {
  it('keeps every card in the shared fixture, in order', () => {
    const cards = parseCards(fixture)
    expect(cards).toHaveLength(fixture.length)
    expect(cards.map((c) => c.key)).toEqual(fixture.map((c) => c.key))
  })

  it('returns nothing for non-arrays', () => {
    expect(parseCards(null)).toEqual([])
    expect(parseCards({ key: 'INTRO' })).toEqual([])
    expect(parseCards('[]')).toEqual([])
  })

  it('drops unknown keys and junk entries but keeps the rest', () => {
    const cards = parseCards([null, 42, 'INTRO', { key: 'NEMESIS', foo: 1 }, intro, { key: 'toString' }])
    expect(cards).toEqual([intro])
  })

  it('keeps only the first card for a repeated key', () => {
    const second = { ...intro, playerName: 'B' }
    expect(parseCards([intro, second])).toEqual([intro])
  })
})

describe('parseCard', () => {
  it.each([
    ['missing field', { key: 'INTRO', playerName: 'A', eventsPlayed: 1, gamesPlayed: 3 }],
    ['wrong type', { ...intro, eventsPlayed: '1' }],
    ['NaN', { ...intro, percentile: NaN }],
    ['non-string imageKey', { ...intro, imageKey: 5 }],
    ['bad hex code', { key: 'MOST_PLAYED_FACTION', faction: { code: 'X', name: 'X', hexCode: 'red' }, events: 1, share: 1 }],
    ['empty list', { key: 'EVENTS_WON', events: [] }],
    ['bad list entry', { key: 'PODIUMS', events: [{ id: 1, name: 'E', date: '2026-01-01' }] }],
    ['bad optional', { key: 'PODIUMS', events: [{ id: 1, name: 'E', date: '2026-01-01', players: 4, place: '1st' }] }],
    ['nested null', { key: 'PAINTING', awards: [{ event: null, category: 'Best', position: 1 }] }],
    ['bad summary faction', { key: 'SUMMARY', playerName: 'A', eventsPlayed: 0, gamesPlayed: 0, wins: 0, podiums: 0, paintingAwards: 0, eventsOrganised: 0, venues: 0, topFaction: {} }],
  ])('rejects %s', (_, raw) => {
    expect(parseCard(raw)).toBeNull()
  })

  it('accepts optional fields being absent', () => {
    const raw = { key: 'SUMMARY', playerName: 'A', eventsPlayed: 0, gamesPlayed: 0, wins: 0, podiums: 0, paintingAwards: 0, eventsOrganised: 2, venues: 0 }
    expect(parseCard(raw)).toEqual(raw)
  })
})
