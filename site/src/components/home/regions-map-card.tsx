import { Card, Title } from '@mantine/core'
import { Link } from '@/components/link'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type RegionData = { geojson_name: string; event_count: number }

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
  0: '#d1d5db', 1: '#3b82f6', 2: '#22c55e', 3: '#f97316', 4: '#facc15', 5: '#ef4444',
}

function getColor(count: number): string {
  return COLORS[Math.min(Math.round(count), 5)]
}

function RegionsThumbnail({ geoJson, countMap }: { geoJson: GeoJsonCollection; countMap: Map<string, number> }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const width = 500
  const height = Math.round(width * 1.4)

  useEffect(() => {
    if (!svgRef.current) return
    const ukBbox = {
      type: 'Feature' as const,
      geometry: { type: 'MultiPoint' as const, coordinates: [[-8.62, 49.94], [1.76, 58.8]] },
      properties: {},
    }
    const projection = d3.geoMercator().fitSize([width, height], ukBbox)
    const pathGen = d3.geoPath().projection(projection)
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, GeoJsonFeature>('path')
      .data(geoJson.features)
      .join('path')
      .attr('d', (feat) => pathGen(feat as d3.GeoPermissibleObjects) ?? '')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('fill', (feat) => getColor(countMap.get(feat.properties.rgn19nm) ?? 0))
  }, [geoJson, countMap, width, height])

  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }} />
}

export function RegionsMapCard({ regions, geoJson }: { regions: RegionData[]; geoJson: GeoJsonCollection }) {
  const countMap = new Map<string, number>(regions.map((r) => [r.geojson_name, r.event_count]))

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Regions</Title>
      <div style={{ flex: 1 }}>
        <Link to="/regions" search={{}}>
          <RegionsThumbnail geoJson={geoJson} countMap={countMap} />
        </Link>
      </div>
    </Card>
  )
}
