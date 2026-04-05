import { useGetRegionEventCounts } from '@/api/hooks'
import { useResizeObserver } from '@mantine/hooks'
import { Box, Group, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
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

const GREY = '#d1d5db'
const colorScale = d3
  .scaleLinear<string>()
  .domain([1, 5])
  .range(['#3b82f6', '#ef4444'])
  .clamp(true)

function getColor(count: number): string {
  return count === 0 ? GREY : colorScale(count)
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
    return { ...feature, geometry: { ...geom, coordinates: rings.map((r, i) => (i === 0 ? rewindCoords(r) : rewindCoords(r).reverse())) } }
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][]
    return { ...feature, geometry: { ...geom, coordinates: polys.map((p) => p.map((r, i) => (i === 0 ? rewindCoords(r) : rewindCoords(r).reverse()))) } }
  }
  return feature
}

function RouteComponent() {
  const { data: regionCounts } = useGetRegionEventCounts()
  const [geoJson, setGeoJson] = useState<GeoJsonCollection | null>(null)
  const [containerRef, containerRect] = useResizeObserver<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    fetch('/uk_regions.geojson')
      .then((r) => r.json())
      .then((gj: GeoJsonCollection) => setGeoJson({ ...gj, features: gj.features.map(rewindFeature) }))
  }, [])

  const width = containerRect.width || 500
  const height = Math.round(width * 1.4)

  useEffect(() => {
    if (!geoJson || !regionCounts || !svgRef.current || width === 0) return

    const countMap = new Map(regionCounts.map((r) => [r.geojson_name, r.event_count]))

    // fitSize on the FeatureCollection gives a world-sized bounding box due to polygon
    // winding order mismatch (D3 expects CCW exterior rings). Fit to a bounding box instead.
    const ukBbox = {
      type: 'Feature' as const,
      geometry: { type: 'MultiPoint' as const, coordinates: [[-8.62, 49.94], [1.76, 60.85]] },
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
  }, [geoJson, regionCounts, width, height])

  return (
    <div>
      <div ref={containerRef} style={{ maxWidth: 480, margin: '0 auto' }}>
        <svg ref={svgRef} width={width} height={height} />
      </div>
      <Group justify="center" mt="md" gap="lg">
        <LegendItem color={GREY} label="No events" />
        <LegendItem color={colorScale(1)} label="1 event" />
        <LegendItem color={colorScale(3)} label="3 events" />
        <LegendItem color={colorScale(5)} label="5+ events" />
      </Group>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={6} align="center">
      <Box w={16} h={16} style={{ backgroundColor: color, borderRadius: 3, flexShrink: 0 }} />
      <Text size="sm">{label}</Text>
    </Group>
  )
}
