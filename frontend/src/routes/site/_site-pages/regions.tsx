import { useGetRegionsOverTime } from '@/api/hooks'
import { AnimatedRegions } from '@/components/animated-regions'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/site/_site-pages/regions')({
  component: RouteComponent,
  staticData: { title: 'Regions' },
})

// GeoJSON from this dataset has CW exterior rings; D3 expects CCW.
// Rewind rings so D3 fills the region rather than its complement.
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

type GeoJsonCollection = {
  type: string
  features: GeoJsonFeature[]
}

function rewindFeature(feature: GeoJsonFeature): GeoJsonFeature {
  const geom = feature.geometry
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
  const { data: snapshots } = useGetRegionsOverTime()

  if (!geoJson || !snapshots) return null

  return <AnimatedRegions snapshots={snapshots} geoJson={geoJson} />
}
