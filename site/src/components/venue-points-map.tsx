import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RegionEventsPanel } from '#/components/region-events-panel'
import type { RegionEvent } from '#/components/animated-regions'
import { UK_BBOX } from '#/data/uk-bbox'
import type { UkRegionFeature } from '#/data/uk-regions-geo'

export type VenuePoint = {
  venueId: number
  /** Venue name where there is one, otherwise the town. */
  label: string
  lon: number
  lat: number
  count: number
  events: RegionEvent[]
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

/**
 * Roll the flat event list up into one point per venue, over the same rolling year
 * the choropleth's final frame shades. Events at a venue that was never geocoded
 * can't be placed, so they're reported separately rather than silently dropped.
 */
export function aggregateVenues(
  events: RegionEvent[],
  windowEnd: string,
): { points: VenuePoint[]; unplaced: number } {
  const start = new Date(windowEnd)
  start.setFullYear(start.getFullYear() - 1)
  const windowStart = isoDate(start)

  const byVenue = new Map<number, VenuePoint>()
  let unplaced = 0

  for (const event of events) {
    if (event.date < windowStart || event.date > windowEnd) continue
    if (event.lon == null || event.lat == null) {
      unplaced++
      continue
    }
    const existing = byVenue.get(event.venueId)
    if (existing) {
      existing.count++
      existing.events.push(event)
      continue
    }
    byVenue.set(event.venueId, {
      venueId: event.venueId,
      label: event.town ?? event.venueName ?? 'Unknown',
      lon: event.lon,
      lat: event.lat,
      count: 1,
      events: [event],
    })
  }

  // Biggest first so the busiest venues paint underneath the smaller ones rather
  // than hiding them.
  return {
    points: [...byVenue.values()].sort((a, b) => b.count - a.count),
    unplaced,
  }
}

type VenuePointsMapProps = {
  events: RegionEvent[]
  /** YYYY-MM-DD; the window shown is the year ending here. */
  windowEnd: string
}

export function VenuePointsMap({ events, windowEnd }: VenuePointsMapProps) {
  // Same deal as AnimatedRegions: the ~98KB of geometry is client-only so it stays
  // out of the SSR payload and the eager bundle.
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

  const [selectedVenue, setSelectedVenue] = useState<number | null>(null)
  const [hovered, setHovered] = useState<VenuePoint | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const width = 500
  const height = Math.round(width * 1.4)

  const { points, unplaced } = useMemo(
    () => aggregateVenues(events, windowEnd),
    [events, windowEnd],
  )

  // Nothing animates here, so the projection is plain React rendering rather than
  // the d3 data-join the choropleth needs.
  const { pathGen, projection } = useMemo(() => {
    const proj = geoMercator().fitSize([width, height], UK_BBOX)
    return { projection: proj, pathGen: geoPath().projection(proj) }
  }, [width, height])

  const placed = useMemo(
    () =>
      points.flatMap((point) => {
        const xy = projection([point.lon, point.lat])
        return xy ? [{ point, x: xy[0], y: xy[1] }] : []
      }),
    [points, projection],
  )

  const selected = points.find((p) => p.venueId === selectedVenue) ?? null

  function toggleVenue(venueId: number) {
    setSelectedVenue((prev) => (prev === venueId ? null : venueId))
  }

  return (
    <div
      ref={containerRef}
      style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseLeave={() => {
        setMousePos(null)
        setHovered(null)
      }}
    >
      <svg
        data-testid="venue-points-map"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxHeight: '70vh' }}
      >
        <g>
          {features?.map((feature) => (
            <path
              key={feature.properties.rgn19nm}
              d={pathGen(feature as GeoPermissibleObjects) ?? ''}
              className="fill-muted stroke-background"
              strokeWidth={0.5}
            />
          ))}
        </g>
        <g>
          {placed.map(({ point, x, y }) => {
            // Area, not radius, carries the count — a 4-event town should look
            // four times the size of a 1-event one, not four times as wide.
            const r = 3 + 2.5 * Math.sqrt(point.count)
            // Labels sit to the right of their dot, flipping to the left near the
            // east coast so they don't run off the viewBox.
            const flip = x > width * 0.6
            return (
              <g key={point.venueId}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  className={
                    point.venueId === selectedVenue
                      ? 'fill-blue-800 stroke-foreground dark:fill-blue-200'
                      : 'fill-blue-600 stroke-background dark:fill-blue-400'
                  }
                  strokeWidth={point.venueId === selectedVenue ? 2 : 1}
                  cursor="pointer"
                  tabIndex={0}
                  role="button"
                  data-venue={point.venueId}
                  aria-label={`${point.label} — ${point.count} ${point.count === 1 ? 'event' : 'events'}`}
                  onMouseEnter={() => setHovered(point)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => toggleVenue(point.venueId)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    toggleVenue(point.venueId)
                  }}
                />
                <text
                  x={flip ? x - r - 4 : x + r + 4}
                  y={y + 4}
                  textAnchor={flip ? 'end' : 'start'}
                  fontSize={12}
                  // The halo keeps the label readable where it crosses a coastline
                  // or another region's fill, in either theme.
                  className="fill-foreground stroke-background pointer-events-none"
                  strokeWidth={3}
                  style={{ paintOrder: 'stroke' }}
                >
                  {point.label} ({point.count})
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      {points.length === 0 && features && (
        <p className="text-sm text-muted-foreground">
          No events with a known location in this period.
        </p>
      )}
      {unplaced > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {unplaced} {unplaced === 1 ? 'event is' : 'events are'} not shown — their
          venue has no location on record.
        </p>
      )}
      {hovered && mousePos && (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded border border-border bg-surface px-2.5 py-1 text-[13px] shadow"
          style={{ left: mousePos.x + 12, top: mousePos.y - 8 }}
        >
          {hovered.events[0].venueName ?? hovered.label} — {hovered.count}{' '}
          {hovered.count === 1 ? 'event' : 'events'}
        </div>
      )}
      {selected && (
        <RegionEventsPanel
          title={selected.events[0].venueName ?? selected.label}
          events={selected.events}
          windowEnd={windowEnd}
          onClose={() => setSelectedVenue(null)}
        />
      )}
    </div>
  )
}
