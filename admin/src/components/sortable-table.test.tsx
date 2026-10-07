import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { MantineProvider, Table } from '@mantine/core'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { SortableTh, useTableSort } from '@/components/sortable-table'

// MantineProvider reads the colour scheme via matchMedia, which jsdom lacks.
beforeAll(() => {
  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(cleanup)

type Row = { id: number; name: string; points: number }
const rows: Row[] = [
  { id: 1, name: 'Bee', points: 10 },
  { id: 2, name: 'Ant', points: 30 },
  { id: 3, name: 'Cat', points: 20 },
]
const columns = {
  name: { value: (r: Row) => r.name },
  points: { value: (r: Row) => r.points, natural: 'desc' as const },
}

function SortTable({ label, param }: { label: string; param: string }) {
  const { rows: sorted, getSortProps } = useTableSort(rows, columns, { param })
  return (
    <Table aria-label={label}>
      <Table.Thead>
        <Table.Tr>
          <SortableTh {...getSortProps('name')}>Name</SortableTh>
          <SortableTh {...getSortProps('points')}>Points</SortableTh>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((r) => (
          <Table.Tr key={r.id}>
            <Table.Td>{r.name}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

const START = '/x?tab=teams&typeCode=ROLLING_YEAR&minFiveEvents=true&painting=12&teamsSort=-joined'

async function setup() {
  const rootRoute = createRootRoute()
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/x',
    component: () => (
      <>
        <SortTable label="events" param="eventsSort" />
        <SortTable label="other" param="otherSort" />
      </>
    ),
  })
  const history = createMemoryHistory({ initialEntries: [START] })
  const router = createRouter({ routeTree: rootRoute.addChildren([pageRoute]), history })
  await act(async () => {
    render(
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>,
    )
    await router.load()
  })
  await screen.findByRole('table', { name: 'events' })
  return { router, history }
}

const names = (label: string) =>
  within(screen.getByRole('table', { name: label }))
    .getAllByRole('cell')
    .map((c) => c.textContent)

const params = (searchStr: string) => new URLSearchParams(searchStr)
const withoutKey = (searchStr: string, key: string) =>
  [...params(searchStr).entries()].filter(([k]) => k !== key)

test('sorting cycles through the URL without touching other state', async () => {
  const { router, history } = await setup()
  const initialSearch = router.state.location.searchStr
  const initialOthers = withoutKey(initialSearch, 'eventsSort')
  const initialLength = history.length
  const header = within(screen.getByRole('table', { name: 'events' })).getByRole('button', { name: /Points/ })

  const expectations: [string | null, string[]][] = [
    ['-points', ['Ant', 'Cat', 'Bee']],
    ['points', ['Bee', 'Cat', 'Ant']],
    [null, ['Bee', 'Ant', 'Cat']],
  ]

  for (const [expectedParam, expectedOrder] of expectations) {
    await act(async () => {
      fireEvent.click(header)
    })
    const { pathname, searchStr } = router.state.location
    expect(pathname).toBe('/x')
    expect(params(searchStr).get('eventsSort')).toBe(expectedParam)
    expect(withoutKey(searchStr, 'eventsSort')).toEqual(initialOthers)
    expect(params(searchStr).get('teamsSort')).toBe('-joined')
    expect(names('events')).toEqual(expectedOrder)
    expect(history.length).toBe(initialLength)
  }

  // After the full cycle the URL is back to exactly where it started.
  expect(router.state.location.searchStr).toBe(initialSearch)
})

test('tables with different params sort independently', async () => {
  const { router } = await setup()
  const eventsName = within(screen.getByRole('table', { name: 'events' })).getByRole('button', { name: /Name/ })

  await act(async () => {
    fireEvent.click(eventsName)
  })

  expect(names('events')).toEqual(['Ant', 'Bee', 'Cat'])
  expect(names('other')).toEqual(['Bee', 'Ant', 'Cat'])
  expect(params(router.state.location.searchStr).get('otherSort')).toBeNull()

  const otherPoints = within(screen.getByRole('table', { name: 'other' })).getByRole('button', { name: /Points/ })
  await act(async () => {
    fireEvent.click(otherPoints)
  })

  expect(names('events')).toEqual(['Ant', 'Bee', 'Cat'])
  expect(names('other')).toEqual(['Ant', 'Cat', 'Bee'])
  expect(params(router.state.location.searchStr).get('eventsSort')).toBe('name')
})

test('reflects the active column via aria-sort', async () => {
  await setup()
  const table = screen.getByRole('table', { name: 'events' })
  const [nameTh, pointsTh] = within(table).getAllByRole('columnheader')
  expect(nameTh.getAttribute('aria-sort')).toBeNull()

  await act(async () => {
    fireEvent.click(within(pointsTh).getByRole('button'))
  })
  expect(pointsTh.getAttribute('aria-sort')).toBe('descending')
  expect(nameTh.getAttribute('aria-sort')).toBeNull()
})
