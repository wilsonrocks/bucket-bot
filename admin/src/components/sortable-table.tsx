import { Group, Table, UnstyledButton } from '@mantine/core'
import type { TableThProps } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react'
import { useRouter, useSearch } from '@tanstack/react-router'
import {
  nextSort,
  parseSort,
  serializeSort,
  sortRows,
  withSearchParam,
  type SortColumns,
  type SortDir,
} from '@/helpers/table-sort'

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

/** A `Table.Th` whose label is a button that cycles the column's sort. */
export function SortableTh({ direction, onSort, children, ...props }: SortProps & TableThProps) {
  const Icon = direction === 'asc' ? IconChevronUp : direction === 'desc' ? IconChevronDown : IconSelector
  return (
    <Table.Th
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
      {...props}
    >
      <UnstyledButton onClick={onSort} fw={700} fz="inherit" w="100%">
        <Group gap={4} wrap="nowrap">
          {children}
          <Icon size={14} stroke={1.5} aria-hidden opacity={direction ? 1 : 0.4} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  )
}
