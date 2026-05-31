import { Link } from '#/components/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { UkRegionFeature } from '#/data/uk-regions-geo'

type RegionData = { geojson_name: string; event_count: number }

const COLORS: Record<number, string> = {
  0: '#d1d5db', 1: '#3b82f6', 2: '#22c55e', 3: '#f97316', 4: '#facc15', 5: '#ef4444',
}

function getColor(count: number): string {
  return COLORS[Math.min(Math.round(count), 5)]
}

// d3 (heavy) and the ~98KB region geometry are imported dynamically so they form their
// own lazy chunk, fetched and executed only once this card mounts — keeping them out of
// the homepage's SSR payload and off the initial render path.
function RegionsThumbnail({ countMap }: { countMap: Map<string, number> }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const width = 500
  const height = Math.round(width * 1.4)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    let cancelled = false
    void (async () => {
      // Import only the d3 submodules the map needs (not the full `d3` barrel that
      // FactionCard pulls in eagerly), so the geo code stays in this lazy chunk.
      const [{ geoMercator, geoPath }, { select }, { ukRegionFeatures }] = await Promise.all([
        import('d3-geo'),
        import('d3-selection'),
        import('#/data/uk-regions-geo'),
      ])
      if (cancelled) return
      const ukBbox = {
        type: 'Feature' as const,
        geometry: { type: 'MultiPoint' as const, coordinates: [[-8.62, 49.94], [1.76, 58.8]] },
        properties: {},
      }
      const projection = geoMercator().fitSize([width, height], ukBbox)
      const pathGen = geoPath().projection(projection)
      select(svg)
        .selectAll<SVGPathElement, UkRegionFeature>('path')
        .data(ukRegionFeatures)
        .join('path')
        .attr('d', (feat) => pathGen(feat as GeoPermissibleObjects) ?? '')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .attr('fill', (feat) => getColor(countMap.get(feat.properties.rgn19nm) ?? 0))
    })()
    return () => {
      cancelled = true
    }
  }, [countMap, width, height])

  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" className="block" />
}

export function RegionsMapCard({ regions }: { regions: RegionData[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const countMap = useMemo(
    () => new Map<string, number>(regions.map((r) => [r.geojson_name, r.event_count])),
    [regions],
  )

  // Defer mounting the map (and thus the d3 + geometry chunk) until the card scrolls
  // near the viewport, so it never competes with the LCP paint.
  useEffect(() => {
    const el = containerRef.current
    if (!el || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Regions</h3>
      <div ref={containerRef} className="flex-1">
        <Link to="/regions" search={{}}>
          {inView ? <RegionsThumbnail countMap={countMap} /> : null}
        </Link>
      </div>
    </div>
  )
}
