// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RegionEvent } from '#/components/animated-regions'
import {
  VenuePointsMap,
  aggregateVenues,
  spreadApart,
} from '#/components/venue-points-map'

// The real Link needs a RouterProvider; the panel's behaviour is what's under test.
vi.mock('#/components/link', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

// jsdom has no matchMedia, which `useMediaQuery` needs to pick the wide callout
// layout over the narrow one.
function setViewport(narrow: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: narrow,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => setViewport(false))

function event(overrides: Partial<RegionEvent> & Pick<RegionEvent, 'id'>): RegionEvent {
  return {
    name: `Event ${overrides.id}`,
    date: '2025-03-01',
    venueId: 1,
    venueName: 'Element Games',
    town: 'Stockport',
    lon: -2.16,
    lat: 53.41,
    geojson_name: 'North West',
    players: 20,
    ...overrides,
  }
}

const windowEnd = '2025-06-01'

describe('aggregateVenues', () => {
  test('groups by venue and counts events in the window', () => {
    const { points } = aggregateVenues(
      [
        event({ id: 1 }),
        event({ id: 2, date: '2025-04-01' }),
        event({ id: 3, venueId: 2, town: 'Falkirk', lon: -3.79, lat: 56.0 }),
      ],
      windowEnd,
    )

    // Sorted busiest-first so the big dots paint under the small ones.
    expect(points.map((p) => [p.label, p.count])).toEqual([
      ['Stockport', 2],
      ['Falkirk', 1],
    ])
    expect(points[0].events.map((e) => e.id)).toEqual([1, 2])
  })

  test('includes both window boundaries and excludes what falls outside', () => {
    const { points } = aggregateVenues(
      [
        event({ id: 1, date: '2024-06-01' }),
        event({ id: 2, date: '2025-06-01' }),
        event({ id: 3, date: '2024-05-31' }),
        event({ id: 4, date: '2025-06-02' }),
      ],
      windowEnd,
    )

    expect(points).toHaveLength(1)
    expect(points[0].events.map((e) => e.id)).toEqual([1, 2])
  })

  test('reports events at a venue with no coordinates instead of placing them', () => {
    const { points, unplaced } = aggregateVenues(
      [
        event({ id: 1 }),
        event({ id: 2, venueId: 3, town: 'Nowhere', lon: null, lat: null }),
      ],
      windowEnd,
    )

    expect(points.map((p) => p.label)).toEqual(['Stockport'])
    expect(unplaced).toBe(1)
  })

  test('falls back to the venue name when the town is unknown', () => {
    const { points } = aggregateVenues([event({ id: 1, town: null })], windowEnd)
    expect(points[0].label).toBe('Element Games')
  })
})

describe('spreadApart', () => {
  test('leaves positions that already clear the gap alone', () => {
    expect(spreadApart([10, 60, 110], 20, 0, 200)).toEqual([10, 60, 110])
  })

  test('pushes crowded positions apart by at least the gap', () => {
    const out = spreadApart([100, 105, 108], 20, 0, 400)
    expect(out).toEqual([100, 120, 140])
  })

  test('keeps the run inside the bounds, still spaced, when it overflows', () => {
    const out = spreadApart([380, 385, 390], 20, 0, 400)
    expect(out).toEqual([360, 380, 400])
  })

  test('spaces a run too long for the bounds from the top edge down', () => {
    const out = spreadApart([50, 50, 50, 50], 20, 0, 40)
    expect(out).toEqual([0, 20, 40, 60])
    for (let i = 1; i < out.length; i++) {
      expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(20)
    }
  })
})

const events: RegionEvent[] = [
  event({ id: 1, name: 'Stockport Open', date: '2025-03-01' }),
  event({ id: 2, name: 'Stockport Masters', date: '2025-04-01' }),
  event({
    id: 3,
    name: 'Falkirk Open',
    venueId: 2,
    venueName: 'Common Ground',
    town: 'Falkirk',
    lon: -3.79,
    lat: 56.0,
    geojson_name: 'Scotland',
  }),
  event({ id: 4, name: 'Too Old To Count', date: '2023-01-01' }),
]

async function renderMap() {
  const utils = render(<VenuePointsMap events={events} windowEnd={windowEnd} />)
  const map = utils.getByTestId('venue-points-map')
  await waitFor(() => {
    expect(map.querySelectorAll('path').length).toBeGreaterThan(0)
  })
  return { ...utils, map }
}

test('renders one labelled dot per venue with events in the window', async () => {
  const { map, getByText } = await renderMap()

  expect(map.querySelectorAll('circle')).toHaveLength(2)
  getByText('Stockport (2)')
  getByText('Falkirk (1)')
})

test('every dot is projected inside the map box', async () => {
  const { map } = await renderMap()

  for (const circle of map.querySelectorAll('circle')) {
    const cx = Number(circle.getAttribute('cx'))
    const cy = Number(circle.getAttribute('cy'))
    expect(cx).toBeGreaterThan(0)
    expect(cx).toBeLessThan(500)
    expect(cy).toBeGreaterThan(0)
    expect(cy).toBeLessThan(700)
  }
})

test('labels sit in the gutters, clear of each other, joined by leader lines', async () => {
  const { map } = await renderMap()

  const labels = [...map.querySelectorAll('text')]
  expect(labels).toHaveLength(2)
  for (const label of labels) {
    const x = Number(label.getAttribute('x'))
    // Outside the 0..500 map box, i.e. in a gutter rather than over the country.
    expect(x < 0 || x > 500).toBe(true)
  }

  // One leader line per venue, each ending at its label.
  const lines = [...map.querySelectorAll('polyline')]
  expect(lines).toHaveLength(2)
  for (const line of lines) {
    const pts = line
      .getAttribute('points')!
      .split(' ')
      .map((p) => p.split(',').map(Number))
    expect(pts).toHaveLength(3)
    // The last segment is horizontal, so the line meets the label head on.
    expect(pts[1][1]).toBe(pts[2][1])
    expect(labels.some((l) => Number(l.getAttribute('x')) === pts[2][0])).toBe(true)
  }
})

test('clicking a dot lists only that venue’s in-window events', async () => {
  const { map, getByText, queryByText } = await renderMap()

  expect(queryByText('Stockport Open')).toBeNull()

  fireEvent.click(map.querySelector('[data-venue="1"]')!)

  getByText('Stockport Open')
  getByText('Stockport Masters')
  expect(queryByText('Falkirk Open')).toBeNull()
  expect(queryByText('Too Old To Count')).toBeNull()
})

test('clicking the same dot again, or the close button, dismisses the panel', async () => {
  const { map, getByLabelText, queryByText } = await renderMap()
  const stockport = map.querySelector('[data-venue="1"]')!

  fireEvent.click(stockport)
  fireEvent.click(getByLabelText('Close events list'))
  expect(queryByText('Stockport Open')).toBeNull()

  fireEvent.click(stockport)
  expect(queryByText('Stockport Open')).not.toBeNull()
  fireEvent.click(stockport)
  expect(queryByText('Stockport Open')).toBeNull()
})

test('Enter on a focused dot opens its panel', async () => {
  const { map, queryByText } = await renderMap()

  fireEvent.keyDown(map.querySelector('[data-venue="2"]')!, { key: 'Enter' })

  expect(queryByText('Falkirk Open')).not.toBeNull()
})

test('a narrow viewport drops the callouts for a list under the map', async () => {
  setViewport(true)
  const { map, getByRole, queryByText } = await renderMap()

  expect(map.querySelectorAll('text')).toHaveLength(0)
  expect(map.querySelectorAll('polyline')).toHaveLength(0)
  expect(map.querySelectorAll('circle')).toHaveLength(2)

  fireEvent.click(getByRole('button', { name: /Stockport · 2 events/ }))
  expect(queryByText('Stockport Open')).not.toBeNull()
})
