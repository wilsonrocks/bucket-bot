// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AnimatedRegions } from '#/components/animated-regions'

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
