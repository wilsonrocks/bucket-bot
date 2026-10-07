// Pure helpers behind sortable tables. Sort state lives in the URL as
// `?sort=key` (ascending) or `?sort=-key` (descending).

export type SortDir = 'asc' | 'desc'

export type SortState<K extends string = string> = { key: K; dir: SortDir }

export type SortColumn<T> = {
  value: (row: T) => unknown
  /** Direction used on the first click — 'desc' suits points, counts and dates. */
  natural?: SortDir
}

export type SortColumns<T, K extends string = string> = Record<K, SortColumn<T>>

/** Parse a raw search value, ignoring anything that isn't a known column. */
export function parseSort<K extends string>(
  raw: unknown,
  keys: readonly K[],
): SortState<K> | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  const desc = raw.startsWith('-')
  const key = (desc ? raw.slice(1) : raw) as K
  return keys.includes(key) ? { key, dir: desc ? 'desc' : 'asc' } : null
}

export function serializeSort(sort: SortState | null): string | undefined {
  if (!sort) return undefined
  return sort.dir === 'desc' ? `-${sort.key}` : sort.key
}

/** natural → reversed → back to the table's default order. */
export function nextSort<K extends string>(
  current: SortState<K> | null,
  key: K,
  natural: SortDir = 'asc',
): SortState<K> | null {
  if (!current || current.key !== key) return { key, dir: natural }
  if (current.dir === natural) return { key, dir: natural === 'asc' ? 'desc' : 'asc' }
  return null
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function isBlank(v: unknown) {
  return v == null || (typeof v === 'number' && Number.isNaN(v))
}

/** Compare two non-blank cell values ascending. */
export function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  const na = typeof a === 'number' ? a : typeof a === 'string' && a.trim() !== '' ? Number(a) : NaN
  const nb = typeof b === 'number' ? b : typeof b === 'string' && b.trim() !== '' ? Number(b) : NaN
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return collator.compare(String(a), String(b))
}

/** Stable sort that never mutates `rows`; blanks always go last. */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  columns: SortColumns<T, K>,
  sort: SortState<K> | null,
): readonly T[] {
  if (!sort) return rows
  const column = columns[sort.key] as SortColumn<T> | undefined
  if (!column) return rows
  const sign = sort.dir === 'desc' ? -1 : 1
  return [...rows].sort((ra, rb) => {
    const a = column.value(ra)
    const b = column.value(rb)
    const blankA = isBlank(a)
    const blankB = isBlank(b)
    if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1
    return sign * compareValues(a, b)
  })
}

/** Set (or delete, when `value` is undefined) one key, leaving every other param alone. */
export function withSearchParam(searchStr: string, param: string, value: string | undefined): string {
  const params = new URLSearchParams(searchStr)
  if (value === undefined) params.delete(param)
  else params.set(param, value)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
