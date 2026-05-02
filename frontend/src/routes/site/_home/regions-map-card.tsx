import { Anchor, Card, Skeleton, Title } from '@mantine/core'
import { Link } from '@/components/link'
import { useGetRegionsOverTime } from '@/api/hooks'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Route as RegionsRoute } from '@/routes/site/_site-pages/regions'

type GeoJsonFeature = {
  type: string
  geometry: object
  properties: { rgn19nm: string; [key: string]: unknown }
}

type GeoJsonCollection = {
  type: string
  features: GeoJsonFeature[]
}

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
    return { ...feature, geometry: { ...geom, coordinates: rings.map((r, i) => i === 0 ? rewindCoords(r) : rewindCoords(r).reverse()) } }
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][]
    return { ...feature, geometry: { ...geom, coordinates: polys.map((p) => p.map((r, i) => i === 0 ? rewindCoords(r) : rewindCoords(r).reverse())) } }
  }
  return feature
}

const COLORS: Record<number, string> = {
  0: '#d1d5db', 1: '#3b82f6', 2: '#22c55e', 3: '#f97316', 4: '#facc15', 5: '#ef4444',
}

function getColor(count: number): string {
  const clamped = Math.min(Math.round(count), 5)
  return COLORS[clamped]
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
      .attr('d', (d) => pathGen(d as d3.GeoPermissibleObjects) ?? '')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('fill', (d) => getColor(countMap.get(d.properties.rgn19nm) ?? 0))
  }, [geoJson, countMap, width, height])

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }} />
  )
}

export function RegionsMapCard() {
  const { data: snapshots, isLoading: snapshotsLoading } = useGetRegionsOverTime()
  const { data: geoJson, isLoading: geoLoading } = useQuery({
    queryKey: ['ukRegions'],
    queryFn: () =>
      import('@/data/ukRegions').then((m) => {
        const gj = m.default as GeoJsonCollection
        return { ...gj, features: gj.features.map(rewindFeature) }
      }),
    staleTime: Infinity,
  })

  const isLoading = snapshotsLoading || geoLoading
  const latestSnapshot = snapshots?.[snapshots.length - 1]
  const countMap = new Map<string, number>(
    latestSnapshot?.regions.map((r) => [r.geojson_name, r.event_count]) ?? [],
  )

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Regions</Title>
      <div style={{ flex: 1 }}>
        {isLoading || !geoJson ? (
          <Skeleton height={240} />
        ) : (
          <Anchor component={Link} to={RegionsRoute.to} style={{ display: 'block' }}>
            <RegionsThumbnail geoJson={geoJson} countMap={countMap} />
          </Anchor>
        )}
      </div>
    </Card>
  )
}
