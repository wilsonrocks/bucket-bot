import { useRouter, useSearch } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  nextSort,
  parseSort,
  serializeSort,
  sortRows,
  withSearchParam,
  type SortColumns,
  type SortDir,
} from '#/helpers/table-sort'

export type SortProps = { direction: SortDir | null; onSort: () => void }

/**
 * Sorts `data` by the column named in the URL (`?sort=key` / `?sort=-key`).
 * Like routed-tabs, it reads search loosely and writes with history.replace, so
 * routes don't need to declare the param and other URL state is left untouched.
 * Pages with several tables pass a distinct `param` per table.
 */
export function useTableSort<T, K extends string>(
  data: readonly T[],
  columns: SortColumns<T, K>,
  { param = 'sort' }: { param?: string } = {},
) {
  const raw = useSearch({ strict: false, select: (search) => (search as Record<string, unknown>)[param] as string | undefined })
  const router = useRouter()
  const sort = parseSort(raw, Object.keys(columns) as K[])

  const rows = sortRows(data, columns, sort)

  const getSortProps = (key: K): SortProps => ({
    direction: sort?.key === key ? sort.dir : null,
    onSort: () => {
      const next = nextSort(sort, key, columns[key].natural)
      const { pathname, searchStr } = router.state.location
      router.history.replace(pathname + withSearchParam(searchStr, param, serializeSort(next)))
    },
  })

  return { rows, getSortProps }
}

type SortableThProps = SortProps & {
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}

/** A `<th>` whose label is a button that cycles the column's sort. */
export function SortableTh({ direction, onSort, children, className = '', align = 'left' }: SortableThProps) {
  const Icon = direction === 'asc' ? ChevronUp : direction === 'desc' ? ChevronDown : ChevronsUpDown
  return (
    <th
      className={`p-0 font-semibold ${className}`}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
    >
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex w-full cursor-pointer items-center gap-1 whitespace-nowrap px-2 py-2 font-semibold hover:text-foreground ${align === 'right' ? 'justify-end text-right' : 'text-left'}`}
      >
        {children}
        <Icon aria-hidden className={`size-3.5 shrink-0 ${direction ? '' : 'opacity-40'}`} />
      </button>
    </th>
  )
}
