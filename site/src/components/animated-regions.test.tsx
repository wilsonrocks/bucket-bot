// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AnimatedRegions, type RegionEvent } from '#/components/animated-regions'

// The real Link needs a RouterProvider; the panel's behaviour is what's under test.
vi.mock('#/components/link', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

const snapshots = [
  {
    date: '2025-01-01',
    regions: [
      { region_id: 1, geojson_name: 'London', event_count: 3 },
      { region_id: 2, geojson_name: 'Wales', event_count: 0 },
    ],
  },
  {
    date: '2025-06-01',
    regions: [
      { region_id: 1, geojson_name: 'London', event_count: 5 },
      { region_id: 2, geojson_name: 'Wales', event_count: 1 },
    ],
  },
]

// Regression test for #110: the region paths are created asynchronously, after the
// geometry chunk loads and after `countMap` has settled. If the fill pass doesn't
// re-run at that point the paths keep the SVG default fill and the whole map is black.
test('every region path has an explicit non-black fill once the geometry loads', async () => {
  const { getByTestId } = render(<AnimatedRegions snapshots={snapshots} />)
  const map = getByTestId('regions-map')

  await waitFor(() => {
    expect(map.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  for (const path of map.querySelectorAll('path')) {
    const fill = path.getAttribute('fill')
    expect(fill).toBeTruthy()
    expect(fill).not.toBe('black')
    expect(fill).not.toBe('#000000')
  }
})

const events: RegionEvent[] = [
  {
    id: 1,
    name: 'In Window Open',
    date: '2025-03-10',
    venueId: 1,
    venueName: 'Dark Sphere',
    town: 'London',
    lon: -0.12,
    lat: 51.5,
    geojson_name: 'London',
    players: 24,
  },
  {
    id: 2,
    name: 'Too Old To Count',
    date: '2023-01-01',
    venueId: 1,
    venueName: null,
    town: '',
    lon: -0.12,
    lat: 51.5,
    geojson_name: 'London',
    players: 0,
  },
  {
    id: 3,
    name: 'Wrong Region Open',
    date: '2025-03-11',
    venueId: 2,
    venueName: null,
    town: '',
    lon: -3.18,
    lat: 51.48,
    geojson_name: 'Wales',
    players: 8,
  },
]

async function renderMap() {
  const utils = render(<AnimatedRegions snapshots={snapshots} events={events} />)
  const map = utils.getByTestId('regions-map')
  await waitFor(() => {
    expect(map.querySelectorAll('path').length).toBeGreaterThan(0)
  })
  return utils
}

test('clicking a region lists only that region’s events inside the current window', async () => {
  const { getByTestId, queryByText, getByText } = await renderMap()
  const london = getByTestId('regions-map').querySelector(
    '[data-region="London"]',
  )!

  expect(queryByText('In Window Open')).toBeNull()

  fireEvent.click(london)

  // The animation starts on the last snapshot (2025-06-01), so the window is
  // 2024-06-01 → 2025-06-01.
  getByText('In Window Open')
  expect(queryByText('Too Old To Count')).toBeNull()
  expect(queryByText('Wrong Region Open')).toBeNull()
  getByText('10 Mar 2025 · Dark Sphere · 24 players')
})

test('the selected region is outlined and keeps a valid fill', async () => {
  const { getByTestId } = await renderMap()
  const map = getByTestId('regions-map')
  const london = map.querySelector('[data-region="London"]')!

  fireEvent.click(london)

  expect(london.getAttribute('stroke-width')).toBe('2')
  expect(london.getAttribute('fill')).toBeTruthy()
  expect(london.getAttribute('fill')).not.toBe('#000000')
  expect(
    map.querySelector('[data-region="Wales"]')!.getAttribute('stroke-width'),
  ).toBe('0.5')
})

test('clicking the same region again, or the close button, dismisses the panel', async () => {
  const { getByTestId, getByLabelText, queryByText } = await renderMap()
  const london = getByTestId('regions-map').querySelector(
    '[data-region="London"]',
  )!

  fireEvent.click(london)
  fireEvent.click(getByLabelText('Close events list'))
  expect(queryByText('In Window Open')).toBeNull()

  fireEvent.click(london)
  expect(queryByText('In Window Open')).not.toBeNull()
  fireEvent.click(london)
  expect(queryByText('In Window Open')).toBeNull()
})

test('Enter on a focused region opens its panel', async () => {
  const { getByTestId, queryByText } = await renderMap()
  const london = getByTestId('regions-map').querySelector(
    '[data-region="London"]',
  )!

  fireEvent.keyDown(london, { key: 'Enter' })

  expect(queryByText('In Window Open')).not.toBeNull()
})
