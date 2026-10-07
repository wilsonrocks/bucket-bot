import { describe, expect, test } from 'vitest'
import {
  compareValues,
  nextSort,
  parseSort,
  serializeSort,
  sortRows,
  withSearchParam,
} from '@/helpers/table-sort'

const entries = (qs: string) => [...new URLSearchParams(qs).entries()]

describe('parseSort / serializeSort', () => {
  const keys = ['name', 'points'] as const

  test('parses ascending and descending keys', () => {
    expect(parseSort('name', keys)).toEqual({ key: 'name', dir: 'asc' })
    expect(parseSort('-points', keys)).toEqual({ key: 'points', dir: 'desc' })
  })

  test('ignores unknown, empty and non-string values', () => {
    expect(parseSort('nope', keys)).toBeNull()
    expect(parseSort('-', keys)).toBeNull()
    expect(parseSort('', keys)).toBeNull()
    expect(parseSort(12, keys)).toBeNull()
    expect(parseSort(undefined, keys)).toBeNull()
  })

  test('round-trips', () => {
    expect(serializeSort({ key: 'name', dir: 'asc' })).toBe('name')
    expect(serializeSort({ key: 'points', dir: 'desc' })).toBe('-points')
    expect(serializeSort(null)).toBeUndefined()
  })
})

describe('nextSort', () => {
  test('ascending-natural column cycles asc → desc → off', () => {
    const a = nextSort(null, 'name')
    expect(a).toEqual({ key: 'name', dir: 'asc' })
    const b = nextSort(a, 'name')
    expect(b).toEqual({ key: 'name', dir: 'desc' })
    expect(nextSort(b, 'name')).toBeNull()
  })

  test('descending-natural column cycles desc → asc → off', () => {
    const a = nextSort(null, 'points', 'desc')
    expect(a).toEqual({ key: 'points', dir: 'desc' })
    const b = nextSort(a, 'points', 'desc')
    expect(b).toEqual({ key: 'points', dir: 'asc' })
    expect(nextSort(b, 'points', 'desc')).toBeNull()
  })

  test('switching column starts at its natural direction', () => {
    expect(nextSort({ key: 'name', dir: 'desc' }, 'points', 'desc')).toEqual({ key: 'points', dir: 'desc' })
  })
})

describe('compareValues', () => {
  test('numbers and numeric strings compare numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues('2', '10')).toBeLessThan(0)
  })

  test('strings compare case-insensitively with natural numbers', () => {
    expect(compareValues('alice', 'Bob')).toBeLessThan(0)
    expect(compareValues('Event 2', 'Event 10')).toBeLessThan(0)
  })

  test('dates and ISO strings compare chronologically', () => {
    expect(compareValues(new Date('2024-01-01'), new Date('2025-01-01'))).toBeLessThan(0)
    expect(compareValues('2024-12-31', '2025-01-01')).toBeLessThan(0)
  })

  test('booleans put false first', () => {
    expect(compareValues(false, true)).toBeLessThan(0)
  })
})

describe('sortRows', () => {
  type Row = { id: number; name: string; points: number | null }
  const rows: Row[] = [
    { id: 1, name: 'Cat', points: 5 },
    { id: 2, name: 'ant', points: null },
    { id: 3, name: 'Bee', points: 20 },
    { id: 4, name: 'Dog', points: 5 },
  ]
  const columns = {
    name: { value: (r: Row) => r.name },
    points: { value: (r: Row) => r.points, natural: 'desc' as const },
  }
  const ids = (rs: readonly Row[]) => rs.map((r) => r.id)

  test('returns the input untouched with no sort', () => {
    expect(sortRows(rows, columns, null)).toBe(rows)
  })

  test('sorts ascending and descending', () => {
    expect(ids(sortRows(rows, columns, { key: 'name', dir: 'asc' }))).toEqual([2, 3, 1, 4])
    expect(ids(sortRows(rows, columns, { key: 'name', dir: 'desc' }))).toEqual([4, 1, 3, 2])
  })

  test('keeps blanks last in both directions and is stable', () => {
    expect(ids(sortRows(rows, columns, { key: 'points', dir: 'desc' }))).toEqual([3, 1, 4, 2])
    expect(ids(sortRows(rows, columns, { key: 'points', dir: 'asc' }))).toEqual([1, 4, 3, 2])
  })

  test('does not mutate the input', () => {
    const before = ids(rows)
    sortRows(rows, columns, { key: 'name', dir: 'desc' })
    expect(ids(rows)).toEqual(before)
  })
})

describe('withSearchParam', () => {
  const start = '?tab=painting&typeCode=ROLLING_YEAR&minFiveEvents=true&painting=12&teamsSort=-joined'
  const others = entries(start)

  test('adding a sort keeps every other param exactly', () => {
    const qs = withSearchParam(start, 'eventsSort', 'points')
    expect(entries(qs)).toEqual([...others, ['eventsSort', 'points']])
  })

  test('changing a sort only changes that key', () => {
    const qs = withSearchParam(`${start}&eventsSort=points`, 'eventsSort', '-points')
    expect(entries(qs)).toEqual([...others, ['eventsSort', '-points']])
  })

  test('resetting deletes only that key', () => {
    const qs = withSearchParam(`${start}&eventsSort=points`, 'eventsSort', undefined)
    expect(entries(qs)).toEqual(others)
  })

  test('resetting the only param leaves no stray "?"', () => {
    expect(withSearchParam('?sort=name', 'sort', undefined)).toBe('')
    expect(withSearchParam('', 'sort', undefined)).toBe('')
  })

  test('values needing encoding survive', () => {
    const qs = withSearchParam('?q=a%20b%26c%2Bd&x=%22quoted%22', 'sort', 'name')
    expect(entries(qs)).toEqual([
      ['q', 'a b&c+d'],
      ['x', '"quoted"'],
      ['sort', 'name'],
    ])
  })

  test('repeated keys are preserved', () => {
    expect(entries(withSearchParam('?a=1&a=2', 'sort', 'name'))).toEqual([
      ['a', '1'],
      ['a', '2'],
      ['sort', 'name'],
    ])
  })
})
