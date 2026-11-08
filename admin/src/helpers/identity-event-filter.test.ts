import { describe, expect, test } from 'vitest'
import { eventOptions, filterByEvent } from '@/helpers/identity-event-filter'

const identities = [
  { id: 'a', results: [{ tourney_id: 2, tourney_name: 'Newer GT' }, { tourney_id: 1, tourney_name: 'Older Event' }] },
  { id: 'b', results: [{ tourney_id: 1, tourney_name: 'Older Event' }, { tourney_id: 1, tourney_name: 'Older Event' }] },
  { id: 'c', results: [] },
  { id: 'd', results: [{ tourney_id: null, tourney_name: 'Orphan' }] },
]

describe('eventOptions', () => {
  test('lists distinct events in first-seen order with identity counts', () => {
    expect(eventOptions(identities)).toEqual([
      { value: '2', label: 'Newer GT (1)' },
      { value: '1', label: 'Older Event (2)' },
    ])
  })

  test('is empty when there are no results', () => {
    expect(eventOptions([{ results: [] }])).toEqual([])
  })
})

describe('filterByEvent', () => {
  test('returns everything when no event is selected', () => {
    expect(filterByEvent(identities, null)).toBe(identities)
  })

  test('keeps only identities with a result at the event', () => {
    expect(filterByEvent(identities, '1').map((i) => i.id)).toEqual(['a', 'b'])
    expect(filterByEvent(identities, '2').map((i) => i.id)).toEqual(['a'])
  })

  test('returns nothing for an unknown event', () => {
    expect(filterByEvent(identities, '99')).toEqual([])
  })
})
