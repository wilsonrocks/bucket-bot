import { fetchRegionsOverTime } from '#/queries'
import { AnimatedRegions } from '#/components/animated-regions'
import { createFileRoute } from '@tanstack/react-router'
import ukRegionsRaw from '#/data/ukRegions'
import { SITE_NAME, seo } from '#/helpers/seo'

function rewindCoords(coords: number[][]): number[][] {
  let area = 0
  for (let i = 0, n = coords.length - 1; i < n; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
  }
  return area > 0 ? [...coords].reverse() : coords
}

type GeoJsonFeature = {
  type: string
  geometry: { type: string; coordinates: unknown }
  properties: { rgn19nm: string; [key: string]: unknown }
}

function rewindFeature(feature: GeoJsonFeature): GeoJsonFeature {
  const geom = feature.geometry
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

export const Route = createFileRoute('/regions')({
  staticData: { title: 'Regions' },
  loader: async () => {
    const snapshots = await fetchRegionsOverTime()
    const geoJson = { ...ukRegionsRaw, features: (ukRegionsRaw as any).features.map(rewindFeature) }
    return { snapshots, geoJson }
  },
  head: () =>
    seo({
      title: `Regions — ${SITE_NAME}`,
      description: 'UK Malifaux activity by region over time.',
      path: '/regions',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { snapshots, geoJson } = Route.useLoaderData()
  return <AnimatedRegions snapshots={snapshots as any} geoJson={geoJson as any} />
}
