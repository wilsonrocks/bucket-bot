// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  TeamRegionsMap,
  groupByRegion,
  regionLeaders,
  teamTileId,
  tileSizeFor,
  type TeamRegionRow,
} from '#/components/team-regions-map'

// The real Link needs a RouterProvider; the map's behaviour is what's under test.
vi.mock('#/components/link', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

const row = (overrides: Partial<TeamRegionRow>): TeamRegionRow => ({
  geojson_name: 'London',
  teamId: 1,
  teamName: 'Team',
  imageKey: null,
  brandColour: null,
  points: 0,
  players: 1,
  events: 1,
  ...overrides,
})

const rows: TeamRegionRow[] = [
  row({ teamId: 1, teamName: 'Alpha', imageKey: 'teams/alpha', brandColour: '#123456', points: 40, players: 3, events: 2 }),
  row({ teamId: 2, teamName: 'Bravo', points: 55.5, players: 2, events: 1 }),
  row({ geojson_name: 'Wales', teamId: 1, teamName: 'Alpha', imageKey: 'teams/alpha', brandColour: '#123456', points: 10 }),
]

test('tileSizeFor shrinks only when no team in the tile has a logo', () => {
  const logo = row({ imageKey: 'teams/x' })
  const letter = row({ imageKey: null })
  expect(tileSizeFor([letter])).toBe(tileSizeFor([logo]) / 2)
  expect(tileSizeFor([letter, logo])).toBe(tileSizeFor([logo]))
  expect(tileSizeFor([letter, letter])).toBe(tileSizeFor([letter]))
})

test('groupByRegion sorts by points, breaking ties by team name', () => {
  const grouped = groupByRegion([
    row({ teamId: 3, teamName: 'Zulu', points: 10 }),
    row({ teamId: 4, teamName: 'Echo', points: 10 }),
    row({ teamId: 5, teamName: 'Big', points: 30 }),
    row({ geojson_name: 'Wales', teamId: 3, teamName: 'Zulu', points: 1 }),
  ])
  expect(grouped.get('London')!.map((r) => r.teamName)).toEqual(['Big', 'Echo', 'Zulu'])
  expect(grouped.get('Wales')!.map((r) => r.teamName)).toEqual(['Zulu'])
})

test('groupByRegion gives tied teams the same rank and skips the next one', () => {
  const london = groupByRegion([
    row({ teamId: 1, teamName: 'Zulu', points: 100 }),
    row({ teamId: 2, teamName: 'Echo', points: 100 }),
    row({ teamId: 3, teamName: 'Big', points: 50 }),
    row({ teamId: 4, teamName: 'Small', points: 50 }),
    row({ teamId: 5, teamName: 'Last', points: 10 }),
  ]).get('London')!
  expect(london.map((r) => [r.teamName, r.rank])).toEqual([
    ['Echo', 1],
    ['Zulu', 1],
    ['Big', 3],
    ['Small', 3],
    ['Last', 5],
  ])
  expect(regionLeaders(london).map((r) => r.teamName)).toEqual(['Echo', 'Zulu'])
})

test('totals that display the same (to 1dp) count as tied; visibly different ones do not', () => {
  const london = groupByRegion([
    row({ teamId: 1, teamName: 'A', points: 446.1402 }),
    row({ teamId: 2, teamName: 'B', points: 446.1398 }),
    row({ teamId: 3, teamName: 'C', points: 446.0 }),
  ]).get('London')!
  expect(london.map((r) => r.rank)).toEqual([1, 1, 3])
})

async function renderMap(mapRows: TeamRegionRow[] = rows) {
  const utils = render(<TeamRegionsMap rows={mapRows} windowEnd="2025-06-01" />)
  const map = utils.getByTestId('team-regions-map')
  await waitFor(() => {
    expect(map.querySelectorAll('path').length).toBeGreaterThan(0)
  })
  return { ...utils, map }
}

test('regions are filled with their leading team’s tile, or grey without points', async () => {
  const { map } = await renderMap()
  expect(map.querySelector('[data-region="London"]')!.getAttribute('fill')).toBe(
    `url(#${teamTileId([2])})`,
  )
  expect(map.querySelector('[data-region="Wales"]')!.getAttribute('fill')).toBe(
    `url(#${teamTileId([1])})`,
  )
  expect(map.querySelector('[data-region="Scotland"]')!.getAttribute('fill')).toBe('#d1d5db')
})

test('each leading team gets a pattern: logo if it has one, initial otherwise', async () => {
  const { map } = await renderMap()
  const alpha = map.querySelector(`pattern#${teamTileId([1])}`)!
  expect(alpha.querySelector('image')!.getAttribute('href')).toMatch(/teams\/alpha-w150\.webp$/)
  expect(alpha.querySelector('rect')!.getAttribute('fill')).toBe('#123456')

  const bravo = map.querySelector(`pattern#${teamTileId([2])}`)!
  // Letter-only tiles are half the size of logo tiles.
  expect(Number(bravo.getAttribute('width'))).toBe(Number(alpha.getAttribute('width')) / 2)
  expect(bravo.querySelector('image')).toBeNull()
  expect(bravo.querySelector('text')!.textContent).toBe('B')
})

test('clicking a region shows every team’s points there, and clicking again hides it', async () => {
  const { map, getByTestId, queryByTestId } = await renderMap()
  const london = map.querySelector('[data-region="London"]')!

  fireEvent.click(london)
  const panel = getByTestId('region-teams-panel')
  const items = [...panel.querySelectorAll('li')].map((li) => li.textContent)
  expect(items).toHaveLength(2)
  expect(items[0]).toContain('Bravo')
  expect(items[0]).toContain('55.5 pts')
  expect(items[1]).toContain('Alpha')
  expect(items[1]).toContain('40 pts')
  expect(items[1]).toContain('3 players · 2 events')
  expect(london.getAttribute('stroke-width')).toBe('3.5')
  expect(
    map.querySelector('[data-region="Wales"]')!.getAttribute('stroke-width'),
  ).toBe('1.5')

  fireEvent.click(london)
  expect(queryByTestId('region-teams-panel')).toBeNull()
})

test('a region with no team points says so', async () => {
  const { map, getByText } = await renderMap()
  fireEvent.keyDown(map.querySelector('[data-region="Scotland"]')!, { key: 'Enter' })
  getByText('No team points here in this period.')
})

const tiedRows: TeamRegionRow[] = [
  row({ teamId: 7, teamName: 'Zulu', imageKey: 'teams/zulu', points: 80 }),
  row({ teamId: 6, teamName: 'Echo', points: 80 }),
  row({ teamId: 8, teamName: 'Third', points: 20 }),
]

test('a tied region gets a shared checkerboard tile of the tied teams', async () => {
  const { map } = await renderMap(tiedRows)
  // Leaders are in name order, so Echo (6) then Zulu (7).
  const id = teamTileId([6, 7])
  expect(map.querySelector('[data-region="London"]')!.getAttribute('fill')).toBe(`url(#${id})`)

  const pattern = map.querySelector(`pattern#${id}`)!
  // Two tied teams → a 2×2 grid of cells, so the pattern is twice a cell's width.
  const cell = pattern.querySelector(':scope > g > rect')!
  expect(Number(pattern.getAttribute('width'))).toBe(2 * Number(cell.getAttribute('width')))
  const cells = [...pattern.querySelectorAll(':scope > g')].map((g) =>
    g.querySelector('image') ? 'Zulu' : g.querySelector('text')!.textContent,
  )
  // Row-major 2×2: E Z / Z E
  expect(cells).toEqual(['E', 'Zulu', 'Zulu', 'E'])
})

test('hovering a tied region names every tied team', async () => {
  const { map, getByText } = await renderMap(tiedRows)
  const london = map.querySelector('[data-region="London"]')!
  fireEvent.mouseMove(map.parentElement!, { clientX: 10, clientY: 10 })
  fireEvent.mouseEnter(london)
  getByText('London — tied: Echo, Zulu (80 pts)')
})

test('the panel shows tied teams with the same rank', async () => {
  const { map, getByTestId } = await renderMap(tiedRows)
  fireEvent.click(map.querySelector('[data-region="London"]')!)
  const ranks = [...getByTestId('region-teams-panel').querySelectorAll('li')].map(
    (li) => li.querySelector('span')!.textContent,
  )
  expect(ranks).toEqual(['1', '1', '3'])
})
