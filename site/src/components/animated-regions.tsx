import { Pause, Play, SkipBack, X } from 'lucide-react'
import { interpolateRgb } from 'd3-interpolate'
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { select } from 'd3-selection'
import { timeFormat } from 'd3-time-format'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '#/components/link'
import type { UkRegionFeature } from '#/data/uk-regions-geo'
type RegionSnapshot = {
  date: string
  regions: Array<{ region_id: number; geojson_name: string; event_count: number }>
}

export type RegionEvent = {
  id: number
  name: string
  /** YYYY-MM-DD */
  date: string
  venueName: string | null
  town: string | null
  geojson_name: string
  players: number
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return Math.max(
    0,
    0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3),
  )
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
  const lower = Math.min(Math.floor(count), 5)
  const upper = Math.min(lower + 1, 5)
  const frac = count % 1
  if (lower === upper || frac === 0) return COLORS[lower]
  return interpolateRgb(COLORS[lower], COLORS[upper])(frac)
}

const formatMapDate = timeFormat('%d %b %Y')

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

type AnimatedRegionsProps = {
  snapshots: RegionSnapshot[]
  events?: RegionEvent[]
  duration?: number
}

export function AnimatedRegions({
  snapshots,
  events = [],
  duration = 750,
}: AnimatedRegionsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  // The ~98KB region geometry is loaded on the client only, keeping it out of the
  // /regions SSR payload and the eagerly-loaded JS bundle.
  const [features, setFeatures] = useState<UkRegionFeature[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void import('#/data/uk-regions-geo').then((m) => {
      if (!cancelled) setFeatures(m.ukRegionFeatures)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const hoveredNameRef = useRef<((name: string | null) => void) | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  // The d3 handlers are attached once, when the geometry lands, so they must not
  // close over `selectedRegion` directly.
  const toggleSelectedRef = useRef<((name: string) => void) | null>(null)
  toggleSelectedRef.current = (name: string) =>
    setSelectedRegion((prev) => (prev === name ? null : name))
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  )

  const [isPlaying, setIsPlaying] = useState(false)
  const offsetRef = useRef(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const initialized = useRef(false)

  const width = 500
  const height = Math.round(width * 1.4)

  hoveredNameRef.current = setHoveredRegion

  // Initialise to the end frame (same as BarRace)
  useEffect(() => {
    if (initialized.current || snapshots.length === 0) return
    initialized.current = true
    const endTime = (snapshots.length - 1) * duration
    offsetRef.current = endTime
    setTimeElapsed(endTime)
  }, [snapshots, duration])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || snapshots.length < 2) {
      setIsPlaying(false)
      return
    }
    const frameCount = snapshots.length
    let raf: number
    const start = performance.now() - offsetRef.current

    function tick(now: number) {
      const elapsed = now - start
      const rawFrame = elapsed / duration
      if (rawFrame >= frameCount - 1) {
        const endTime = (frameCount - 1) * duration
        offsetRef.current = endTime
        setTimeElapsed(endTime)
        setIsPlaying(false)
        return
      }
      offsetRef.current = elapsed
      setTimeElapsed(elapsed)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [snapshots, isPlaying, duration])

  const canAnimate = snapshots.length >= 2

  function handlePlayPause() {
    if (!canAnimate) return
    const endTime = (snapshots.length - 1) * duration
    if (!isPlaying && timeElapsed >= endTime) {
      offsetRef.current = 0
      setTimeElapsed(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }

  function handleReset() {
    if (!canAnimate) return
    offsetRef.current = 0
    setTimeElapsed(0)
    setIsPlaying(false)
  }

  // Normalised cumulative date fractions (0..1) so animation time is proportional
  // to real calendar time rather than equal per snapshot. Consecutive-day pairs
  // (e.g. Feb 1 + Feb 2) then receive a proportionally tiny slice of total time
  // instead of a full `duration` ms each, eliminating the "frozen" effect.
  const dateFractions = useMemo(() => {
    if (snapshots.length < 2) return snapshots.map((_, i) => i)
    const ms = snapshots.map((s) => new Date(s.date).getTime())
    const span = ms[ms.length - 1] - ms[0]
    if (span === 0) return ms.map((_, i) => i / (ms.length - 1))
    return ms.map((d) => (d - ms[0]) / span)
  }, [snapshots])

  const { frame, t } = useMemo(() => {
    if (snapshots.length === 0) return { frame: 0, t: 0 }
    const frameCount = snapshots.length
    const totalTime = (frameCount - 1) * duration
    const progress = Math.max(0, Math.min(timeElapsed / totalTime, 1))
    // Map linear progress → calendar-proportional frame + t
    for (let i = 0; i < frameCount - 1; i++) {
      if (progress <= dateFractions[i + 1] || i === frameCount - 2) {
        const segLen = dateFractions[i + 1] - dateFractions[i]
        const segT = segLen === 0 ? 0 : (progress - dateFractions[i]) / segLen
        return { frame: i, t: Math.max(0, Math.min(segT, 1)) }
      }
    }
    return { frame: frameCount - 1, t: 0 }
  }, [timeElapsed, snapshots, duration, dateFractions])

  // Catmull-Rom interpolated event count per geojson_name (matches bar-race approach)
  const countMap = useMemo(() => {
    const frameCount = snapshots.length
    if (frameCount === 0) return new Map<string, number>()
    const iPrev = Math.max(frame - 1, 0)
    const iCur = frame
    const iNext = Math.min(frame + 1, frameCount - 1)
    const iFar = Math.min(frame + 2, frameCount - 1)
    const getCount = (snap: (typeof snapshots)[number], name: string) =>
      snap.regions.find((r) => r.geojson_name === name)?.event_count ?? 0
    const allNames = new Set(snapshots[iCur].regions.map((r) => r.geojson_name))
    const result = new Map<string, number>()
    for (const name of allNames) {
      result.set(
        name,
        catmullRom(
          getCount(snapshots[iPrev], name),
          getCount(snapshots[iCur], name),
          getCount(snapshots[iNext], name),
          getCount(snapshots[iFar], name),
          t,
        ),
      )
    }
    return result
  }, [frame, t, snapshots])

  // Lets the path-creation effect read the current counts without depending on
  // them (which would rebuild every path on every animation tick).
  const countMapRef = useRef(countMap)
  countMapRef.current = countMap

  const interpolatedDate = useMemo(() => {
    const cur = snapshots[frame]
    if (!cur) return null
    const next = snapshots[Math.min(frame + 1, snapshots.length - 1)]
    const dateA = new Date(cur.date)
    const dateB = new Date(next.date)
    return new Date(dateA.getTime() + (dateB.getTime() - dateA.getTime()) * t)
  }, [frame, t, snapshots])

  const displayedDate = interpolatedDate ? formatMapDate(interpolatedDate) : ''

  // The snapshot counts cover the year up to their own date, so the event list has
  // to use the same window or it won't agree with the colour it sits under.
  const eventWindow = useMemo(() => {
    if (!interpolatedDate) return null
    const start = new Date(interpolatedDate)
    start.setFullYear(start.getFullYear() - 1)
    return { start: isoDate(start), end: isoDate(interpolatedDate) }
  }, [interpolatedDate])

  const selectedEvents = useMemo(() => {
    if (!selectedRegion || !eventWindow) return []
    return events.filter(
      (e) =>
        e.geojson_name === selectedRegion &&
        e.date >= eventWindow.start &&
        e.date <= eventWindow.end,
    )
  }, [events, selectedRegion, eventWindow])

  // Set up SVG paths (runs once the geometry has loaded)
  useEffect(() => {
    if (!features || !svgRef.current) return

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
    const projection = geoMercator().fitSize([width, height], ukBbox)
    const pathGen = geoPath().projection(projection)

    const svg = select(svgRef.current)
    svg
      .selectAll<SVGPathElement, UkRegionFeature>('path')
      .data(features)
      .join('path')
      .attr('d', (d) => pathGen(d as GeoPermissibleObjects) ?? '')
      // Seed the fill here too: a freshly joined <path> has no fill attribute and
      // would otherwise fall back to the SVG default of black.
      .attr('fill', (d) =>
        getColor(countMapRef.current.get(d.properties.rgn19nm) ?? 0),
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('data-region', (d) => d.properties.rgn19nm)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.properties.rgn19nm} — show events`)
      .attr('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        hoveredNameRef.current?.(d.properties.rgn19nm)
      })
      .on('mouseleave', () => {
        hoveredNameRef.current?.(null)
      })
      .on('click', (_event, d) => {
        toggleSelectedRef.current?.(d.properties.rgn19nm)
      })
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        toggleSelectedRef.current?.(d.properties.rgn19nm)
      })
  }, [features, width, height])

  // Update fills on each animation tick, and once the geometry has arrived — the
  // paths are created asynchronously after `countMap` has already settled, so
  // `features` must be a dependency or the map never gets its first colouring.
  useEffect(() => {
    if (!svgRef.current) return
    select(svgRef.current)
      .selectAll<SVGPathElement, UkRegionFeature>('path')
      .attr('fill', (d) => getColor(countMap.get(d.properties.rgn19nm) ?? 0))
      // Same pass as the fill on purpose: a separate effect is what broke #110.
      .attr('stroke', (d) =>
        d.properties.rgn19nm === selectedRegion ? '#111827' : '#fff',
      )
      .attr('stroke-width', (d) =>
        d.properties.rgn19nm === selectedRegion ? 2 : 0.5,
      )
  }, [countMap, features, selectedRegion])

  return (
    <div
      style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseLeave={() => setMousePos(null)}
    >
      <div className="mb-2.5 flex items-center gap-3">
        <strong>{displayedDate}</strong>
        <button
          type="button"
          onClick={handleReset}
          disabled={!canAnimate}
          className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        >
          <SkipBack size={16} />
        </button>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!canAnimate}
          className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
      <svg
        ref={svgRef}
        data-testid="regions-map"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxHeight: '70vh' }}
      />
      <LadderLegend />
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
          {hoveredRegion} — {Math.round(countMap.get(hoveredRegion) ?? 0)}{' '}
          {Math.round(countMap.get(hoveredRegion) ?? 0) === 1
            ? 'event'
            : 'events'}
        </div>
      )}
      {selectedRegion && eventWindow && (
        <RegionEventsPanel
          region={selectedRegion}
          events={selectedEvents}
          windowEnd={eventWindow.end}
          onClose={() => setSelectedRegion(null)}
        />
      )}
    </div>
  )
}

function RegionEventsPanel({
  region,
  events,
  windowEnd,
  onClose,
}: {
  region: string
  events: RegionEvent[]
  /** YYYY-MM-DD; the window is the year ending here. */
  windowEnd: string
  onClose: () => void
}) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{region}</h3>
          <p className="text-sm text-muted-foreground">
            Year up to {formatMapDate(new Date(windowEnd))}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close events list"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events in this region in this period.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const place = event.venueName ?? event.town
            return (
              <div key={event.id}>
                <Link
                  to="/event/$id"
                  params={{ id: event.id }}
                  search={{ tab: undefined, painting: undefined }}
                  className="font-semibold"
                >
                  {event.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatMapDate(new Date(event.date))}
                  {place ? ` · ${place}` : ''}
                  {event.players ? ` · ${event.players} players` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
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
    <div style={{ position: 'absolute', top: 8, right: 8 }}>
      {LEGEND_ITEMS.map(({ count, label }, i) => (
        <div key={count} className="flex items-center justify-end gap-2 whitespace-nowrap">
          <span className="text-sm">{label}</span>
          <div
            style={{
              width: 20,
              height: 28,
              backgroundColor: COLORS[count],
              flexShrink: 0,
              borderTop: i === 0 ? '1px solid #000' : 'none',
              borderLeft: '1px solid #000',
              borderRight: '1px solid #000',
              borderBottom: i === LEGEND_ITEMS.length - 1 ? '1px solid #000' : 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}
