import { useGetRegionEventCounts } from '@/api/hooks'
import { Box, Group, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/site/_site-pages/regions')({
  component: RouteComponent,
  staticData: { title: 'Regions' },
})

type GeoJsonFeature = {
  type: string
  geometry: object
  properties: { rgn19nm: string; [key: string]: unknown }
}

type GeoJsonCollection = {
  type: string
  features: GeoJsonFeature[]
}

const COLORS: Record<number, string> = {
  0: '#d1d5db',
  1: '#3b82f6',
  2: '#22c55e',
  3: '#f97316',
  4: '#facc15',
  5: '#ef4444',
}

function getColor(count: number): string {
  return COLORS[Math.min(count, 5)]
}

// GeoJSON from this dataset has CW exterior rings; D3 expects CCW.
// Rewind rings so D3 fills the region rather than its complement.
function rewindCoords(coords: number[][]): number[][] {
  let area = 0
  for (let i = 0, n = coords.length - 1; i < n; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
  }
  return area > 0 ? [...coords].reverse() : coords
}

function rewindFeature(feature: GeoJsonFeature): GeoJsonFeature {
  const geom = feature.geometry as { type: string; coordinates: unknown }
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as number[][][]
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: rings.map((r, i) =>
          i === 0 ? rewindCoords(r) : rewindCoords(r).reverse(),
        ),
      },
    }
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][]
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: polys.map((p) =>
          p.map((r, i) =>
            i === 0 ? rewindCoords(r) : rewindCoords(r).reverse(),
          ),
        ),
      },
    }
  }
  return feature
}

function RouteComponent() {
  const { data: geoJson } = useQuery({
    queryKey: ['ukRegions'],
    queryFn: () =>
      import('@/data/ukRegions').then((m) => {
        const gj = m.default as GeoJsonCollection
        return { ...gj, features: gj.features.map(rewindFeature) }
      }),
    staleTime: Infinity,
  })
  const { data: regionCounts } = useGetRegionEventCounts()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const hoveredNameRef = useRef<((name: string | null) => void) | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const width = 500
  const height = Math.round(width * 1.4)

  hoveredNameRef.current = setHoveredRegion

  useEffect(() => {
    if (!geoJson || !regionCounts || !svgRef.current) return

    const countMap = new Map(
      regionCounts.map((r) => [r.geojson_name, r.event_count]),
    )

    const ukBbox = {
      type: 'Feature' as const,
      geometry: {
        type: 'MultiPoint' as const,
        coordinates: [
          [-8.62, 49.94],
          [1.76, 58.8],
        ],
      },
      properties: {},
    }
    const projection = d3.geoMercator().fitSize([width, height], ukBbox)
    const pathGen = d3.geoPath().projection(projection)

    const svg = d3.select(svgRef.current)
    svg
      .selectAll<SVGPathElement, GeoJsonFeature>('path')
      .data(geoJson.features)
      .join('path')
      .attr('d', (d) => pathGen(d as d3.GeoPermissibleObjects) ?? '')
      .attr('fill', (d) => getColor(countMap.get(d.properties.rgn19nm) ?? 0))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseenter', (_event, d) => {
        hoveredNameRef.current?.(d.properties.rgn19nm)
      })
      .on('mouseleave', () => {
        hoveredNameRef.current?.(null)
      })
  }, [geoJson, regionCounts, width, height])

  return (
    <Group align="flex-start" gap="xl" style={{ position: 'relative' }}>
      <div
        style={{ maxWidth: 480, flex: '1 1 auto', position: 'relative' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseLeave={() => setMousePos(null)}
      >
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" />
        {hoveredRegion && mousePos && (
          <div
            style={{
              position: 'absolute',
              left: mousePos.x + 12,
              top: mousePos.y - 8,
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 13,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {hoveredRegion}
          </div>
        )}
      </div>
      <LadderLegend />
    </Group>
  )
}

const LEGEND_ITEMS = [
  { count: 0, label: 'No events' },
  { count: 1, label: '1 event' },
  { count: 2, label: '2 events' },
  { count: 3, label: '3 events' },
  { count: 4, label: '4 events' },
  { count: 5, label: '5+ events' },
]

function LadderLegend() {
  return (
    <div style={{ paddingTop: 8 }}>
      {LEGEND_ITEMS.map(({ count, label }, i) => (
        <Group key={count} gap={8} align="center" wrap="nowrap">
          <Box
            w={20}
            h={28}
            style={{
              backgroundColor: COLORS[count],
              flexShrink: 0,
              borderTop: i === 0 ? '1px solid #aaa' : 'none',
              borderLeft: '1px solid #aaa',
              borderRight: '1px solid #aaa',
              borderBottom:
                i === LEGEND_ITEMS.length - 1 ? '1px solid #aaa' : 'none',
            }}
          />
          <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
            {label}
          </Text>
        </Group>
      ))}
    </div>
  )
}
