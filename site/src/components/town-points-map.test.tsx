// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RegionEvent } from '#/components/animated-regions'
import {
  TownPointsMap,
  aggregateTowns,
  labelMetrics,
  spreadApart,
} from '#/components/town-points-map'

// The real Link needs a RouterProvider; the panel's behaviour is what's under test.
vi.mock('#/components/link', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

// The layout is driven by the map's measured width, which jsdom reports as 0 and
// never observes, so both have to be stubbed to choose a layout.
function setWidth(px: number) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: px,
    height: (px * 700) / 850,
  } as DOMRect)
}

const WIDE = 820
const PHONE = 390

beforeEach(() => {
  vi.restoreAllMocks()
  setWidth(WIDE)
})

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

describe('aggregateTowns', () => {
  test('groups by venue and counts events in the window', () => {
    const { points } = aggregateTowns(
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
    const { points } = aggregateTowns(
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
    const { points, unplaced } = aggregateTowns(
      [
        event({ id: 1 }),
        event({ id: 2, venueId: 3, town: 'Nowhere', lon: null, lat: null }),
      ],
      windowEnd,
    )

    expect(points.map((p) => p.label)).toEqual(['Stockport'])
    expect(unplaced).toBe(1)
  })

  test('falls back to the venue name when the town is blank', () => {
    const { points } = aggregateTowns([event({ id: 1, town: '' })], windowEnd)
    expect(points[0].label).toBe('Element Games')
  })
})

describe('aggregateTowns grouping by town', () => {
  test('merges two venues in one town into a single dot', () => {
    const { points } = aggregateTowns(
      [
        event({ id: 1, venueId: 1, venueName: 'Element Games', lon: -2.2, lat: 53.4 }),
        event({ id: 2, venueId: 7, venueName: 'The Games Shop', lon: -2.1, lat: 53.5 }),
      ],
      windowEnd,
    )

    expect(points).toHaveLength(1)
    expect(points[0].label).toBe('Stockport')
    expect(points[0].count).toBe(2)
    // Placed at the mean of the two venues.
    expect(points[0].lon).toBeCloseTo(-2.15)
    expect(points[0].lat).toBeCloseTo(53.45)
  })

  test('weights the position by venue, not by how many events each ran', () => {
    const { points } = aggregateTowns(
      [
        event({ id: 1, venueId: 1, lon: -2.2, lat: 53.4 }),
        event({ id: 2, venueId: 1, lon: -2.2, lat: 53.4 }),
        event({ id: 3, venueId: 1, lon: -2.2, lat: 53.4 }),
        event({ id: 4, venueId: 7, lon: -2.0, lat: 53.6 }),
      ],
      windowEnd,
    )

    expect(points[0].count).toBe(4)
    expect(points[0].lon).toBeCloseTo(-2.1)
    expect(points[0].lat).toBeCloseTo(53.5)
  })

  test('treats town names case- and whitespace-insensitively', () => {
    const { points } = aggregateTowns(
      [
        event({ id: 1, venueId: 1, town: 'Stockport' }),
        event({ id: 2, venueId: 7, town: '  stockport ' }),
      ],
      windowEnd,
    )

    expect(points).toHaveLength(1)
    // Labelled as first written, not as last matched.
    expect(points[0].label).toBe('Stockport')
  })

  test('keeps a venue with a blank town on a dot of its own', () => {
    const { points } = aggregateTowns(
      [
        event({ id: 1, venueId: 1, town: 'Stockport' }),
        event({ id: 2, venueId: 7, town: '', venueName: 'Somewhere Hall' }),
        event({ id: 3, venueId: 8, town: '  ', venueName: 'Another Hall' }),
      ],
      windowEnd,
    )

    // Venues with a blank town are not lumped together under one nameless dot.
    expect(points.map((p) => p.label).sort()).toEqual([
      'Another Hall',
      'Somewhere Hall',
      'Stockport',
    ])
  })

  test('gathers every event of the town behind its dot', () => {
    const { points } = aggregateTowns(
      [
        event({ id: 1, venueId: 1, name: 'At Element' }),
        event({ id: 2, venueId: 7, name: 'At The Games Shop' }),
      ],
      windowEnd,
    )

    expect(points[0].events.map((e) => e.name)).toEqual([
      'At Element',
      'At The Games Shop',
    ])
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
  const utils = render(<TownPointsMap events={events} windowEnd={windowEnd} />)
  const map = utils.getByTestId('town-points-map')
  await waitFor(() => {
    expect(map.querySelectorAll('path').length).toBeGreaterThan(0)
  })
  return { ...utils, map }
}

test('renders one labelled dot per venue with events in the window', async () => {
  const { map, getByRole } = await renderMap()

  expect(map.querySelectorAll('[data-town]')).toHaveLength(2)
  getByRole('button', { name: 'Stockport (2)' })
  getByRole('button', { name: 'Falkirk (1)' })
})

test('every dot is projected inside the map box', async () => {
  const { map } = await renderMap()

  for (const circle of map.querySelectorAll('[data-town] circle')) {
    const cx = Number(circle.getAttribute('cx'))
    const cy = Number(circle.getAttribute('cy'))
    expect(cx).toBeGreaterThan(0)
    expect(cx).toBeLessThan(500)
    expect(cy).toBeGreaterThan(0)
    expect(cy).toBeLessThan(700)
  }
})

test('labels are HTML at a real font size, not text scaled with the viewBox', async () => {
  const { map, getByRole } = await renderMap()

  // SVG <text> would shrink with the map; these have to be HTML.
  expect(map.querySelectorAll('text')).toHaveLength(0)
  const label = getByRole('button', { name: 'Stockport (2)' })
  expect(label.tagName).toBe('BUTTON')
  expect(label.className).toContain('text-base')
})

test('labels sit in the gutters, clear of each other, joined by leader lines', async () => {
  const { map, getByRole } = await renderMap()

  // The gutters are the outer 175/850 of the box on each side, so a label anchored
  // inside that range is clear of the country rather than sitting over it.
  for (const name of ['Stockport (2)', 'Falkirk (1)']) {
    const left = parseFloat(getByRole('button', { name }).style.left)
    expect(left < (175 / 850) * 100 || left > (675 / 850) * 100).toBe(true)
  }

  // One leader line per venue, each ending level with a label.
  const lines = [...map.querySelectorAll('polyline')]
  expect(lines).toHaveLength(2)
  const labelTops = ['Stockport (2)', 'Falkirk (1)'].map((name) =>
    parseFloat(getByRole('button', { name }).style.top),
  )
  for (const line of lines) {
    const pts = line
      .getAttribute('points')!
      .split(' ')
      .map((p) => p.split(',').map(Number))
    expect(pts).toHaveLength(3)
    // The last segment is horizontal, so the line meets its label head on.
    expect(pts[1][1]).toBe(pts[2][1])
    const topPct = (pts[2][1] / 700) * 100
    expect(labelTops.some((t) => Math.abs(t - topPct) < 0.001)).toBe(true)
  }
})

test('clicking a dot lists only that venue’s in-window events', async () => {
  const { map, getByText, queryByText } = await renderMap()

  expect(queryByText('Stockport Open')).toBeNull()

  fireEvent.click(map.querySelector('[data-town="town:stockport"]')!)

  getByText('Stockport Open')
  getByText('Stockport Masters')
  expect(queryByText('Falkirk Open')).toBeNull()
  expect(queryByText('Too Old To Count')).toBeNull()
})

test('clicking the same dot again, or the close button, dismisses the panel', async () => {
  const { map, getByLabelText, queryByText } = await renderMap()
  const stockport = map.querySelector('[data-town="town:stockport"]')!

  fireEvent.click(stockport)
  fireEvent.click(getByLabelText('Close events list'))
  expect(queryByText('Stockport Open')).toBeNull()

  fireEvent.click(stockport)
  expect(queryByText('Stockport Open')).not.toBeNull()
  fireEvent.click(stockport)
  expect(queryByText('Stockport Open')).toBeNull()
})

test('a venue can be opened from its label as well as its dot', async () => {
  const { getByRole, queryByText } = await renderMap()

  fireEvent.click(getByRole('button', { name: 'Falkirk (1)' }))

  expect(queryByText('Falkirk Open')).not.toBeNull()
})

test('a narrow viewport keeps the callouts, dropping only the counts', async () => {
  setWidth(PHONE)
  const { map, getByRole, queryByText } = await renderMap()

  // Same leader lines and labels as the wide layout…
  expect(map.querySelectorAll('polyline')).toHaveLength(2)
  const label = getByRole('button', { name: 'Stockport — 2 events' })
  expect(label.className).toContain('text-xs')
  // …but the count is off the map, so the gutters can stay narrow.
  expect(label.textContent).toBe('Stockport')
  expect(queryByText('Stockport (2)')).toBeNull()
})

describe('labelMetrics', () => {
  test('grows the viewBox gaps as the map shrinks, so they stay constant on screen', () => {
    const wide = labelMetrics(WIDE)
    const phone = labelMetrics(PHONE)

    // A fixed viewBox gap would shrink with the map and let labels collide on a
    // phone, so in viewBox units the spacing has to grow as the map gets smaller.
    expect(phone.labelGap).toBeGreaterThan(wide.labelGap)
    expect(phone.elbow).toBeGreaterThan(wide.elbow)
  })

  test('switches to the narrow treatment below the breakpoint', () => {
    expect(labelMetrics(WIDE).narrow).toBe(false)
    expect(labelMetrics(PHONE).narrow).toBe(true)
  })

  test('never lets the gutters squeeze the map out', () => {
    // Two 92px gutters would not fit either side of a 150px box, so they get
    // capped and the map keeps a workable share of it.
    for (const width of [150, 320, PHONE, WIDE]) {
      const { gutter } = labelMetrics(width)
      expect(500 / (500 + gutter * 2)).toBeGreaterThan(0.4)
    }
  })
})

test('a narrow viewport gives each dot a tap target bigger than the dot', async () => {
  setWidth(PHONE)
  const { map } = await renderMap()

  for (const group of map.querySelectorAll('[data-town]')) {
    const [hit, dot] = [...group.querySelectorAll('circle')]
    expect(hit.getAttribute('fill')).toBe('transparent')
    expect(Number(hit.getAttribute('r'))).toBeGreaterThanOrEqual(18)
    expect(Number(hit.getAttribute('r'))).toBeGreaterThan(Number(dot.getAttribute('r')))
  }
})

test('a wide viewport keeps the panel below the map rather than a modal', async () => {
  const { map, queryByRole, getByText } = await renderMap()

  fireEvent.click(map.querySelector('[data-town="town:stockport"]')!)

  expect(queryByRole('dialog')).toBeNull()
  getByText('Stockport Open')
})
