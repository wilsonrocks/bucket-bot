import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { useEffect, useMemo, useState } from 'react'
import { RegionEventsPanel } from '#/components/region-events-panel'
import type { RegionEvent } from '#/components/animated-regions'
import { useMediaQuery } from '#/helpers/use-media-query'
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

/**
 * Push an ascending list of wanted positions apart until every neighbouring pair
 * is at least `gap` apart, keeping the whole run inside [min, max] and staying as
 * close to the wanted positions as that allows.
 */
export function spreadApart(
  wanted: number[],
  gap: number,
  min: number,
  max: number,
): number[] {
  const out = [...wanted]
  for (let i = 0; i < out.length; i++) {
    out[i] = i === 0 ? Math.max(out[i], min) : Math.max(out[i], out[i - 1] + gap)
  }
  // The forward pass can run the tail off the bottom edge; walking back up pulls
  // the overflow into the slack above.
  if (out.length > 0 && out[out.length - 1] > max) {
    out[out.length - 1] = max
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.min(out[i], out[i + 1] - gap)
    }
    // …which can in turn push the head off the top. Both sequences step by at
    // least `gap`, so taking the larger of the two keeps every pair apart.
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.max(out[i], min + i * gap)
    }
  }
  return out
}

/** The map itself; labels live in gutters either side of this box. */
const MAP_W = 500
const MAP_H = Math.round(MAP_W * 1.4)
/** Room for a label like "Newport Pagnell (2)" beside the map. */
const GUTTER = 175
const LABEL_GAP = 24
const LABEL_INSET = 12
/** Length of the horizontal run of a leader line, next to its label. */
const ELBOW = 26

type LaidOutPoint = {
  point: VenuePoint
  x: number
  y: number
  side: 'left' | 'right'
  labelY: number
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
  // The callout gutters need more width than a phone has, so small screens get the
  // plain dots and read the names off the list underneath instead.
  const isNarrow = useMediaQuery('(max-width: 640px)')

  const { points, unplaced } = useMemo(
    () => aggregateVenues(events, windowEnd),
    [events, windowEnd],
  )

  // Nothing animates here, so this is plain React rendering rather than the d3
  // data-join the choropleth needs.
  const { pathGen, projection } = useMemo(() => {
    const proj = geoMercator().fitSize([MAP_W, MAP_H], UK_BBOX)
    return { projection: proj, pathGen: geoPath().projection(proj) }
  }, [])

  // Labels are stacked down each gutter in map order and joined to their dot by a
  // leader line, so no two can ever overlap however tightly the venues cluster.
  const laidOut = useMemo<LaidOutPoint[]>(() => {
    const sides: Record<'left' | 'right', Array<{ point: VenuePoint; x: number; y: number }>> = {
      left: [],
      right: [],
    }
    const projected = points.flatMap((point) => {
      const xy = projection([point.lon, point.lat])
      return xy ? [{ point, x: xy[0], y: xy[1] }] : []
    })
    // Split down the middle of where the venues actually are rather than the middle
    // of the map: UK venues cluster well east of centre, so a fixed midpoint would
    // send almost every label to the right gutter in one long stack.
    const xs = projected.map((p) => p.x)
    const split = xs.length > 0 ? (Math.min(...xs) + Math.max(...xs)) / 2 : MAP_W / 2
    for (const p of projected) sides[p.x < split ? 'left' : 'right'].push(p)
    return (['left', 'right'] as const).flatMap((side) => {
      const column = sides[side].sort((a, b) => a.y - b.y)
      const ys = spreadApart(
        column.map((c) => c.y),
        LABEL_GAP,
        LABEL_GAP / 2,
        MAP_H - LABEL_GAP / 2,
      )
      return column.map((c, i) => ({ ...c, side, labelY: ys[i] }))
    })
  }, [points, projection])

  const selected = points.find((p) => p.venueId === selectedVenue) ?? null

  function toggleVenue(venueId: number) {
    setSelectedVenue((prev) => (prev === venueId ? null : venueId))
  }

  const gutter = isNarrow ? 0 : GUTTER

  return (
    <div style={{ maxWidth: isNarrow ? 480 : 820, margin: '0 auto' }}>
      <svg
        data-testid="venue-points-map"
        viewBox={`${-gutter} 0 ${MAP_W + gutter * 2} ${MAP_H}`}
        width="100%"
        style={{ maxHeight: '75vh' }}
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
        {!isNarrow && (
          <g className="stroke-muted-foreground" strokeWidth={1} fill="none">
            {laidOut.map(({ point, x, y, side, labelY }) => {
              const labelX = side === 'left' ? -LABEL_INSET : MAP_W + LABEL_INSET
              const elbowX = side === 'left' ? labelX + ELBOW : labelX - ELBOW
              return (
                <polyline
                  key={point.venueId}
                  points={`${x},${y} ${elbowX},${labelY} ${labelX},${labelY}`}
                />
              )
            })}
          </g>
        )}
        <g>
          {laidOut.map(({ point, x, y, side, labelY }) => {
            // Area, not radius, carries the count — a 4-event town should look
            // four times the size of a 1-event one, not four times as wide.
            const r = 4 + 3 * Math.sqrt(point.count)
            const isSelected = point.venueId === selectedVenue
            const labelX = side === 'left' ? -LABEL_INSET : MAP_W + LABEL_INSET
            return (
              <g
                key={point.venueId}
                cursor="pointer"
                tabIndex={0}
                role="button"
                data-venue={point.venueId}
                aria-label={`${point.label} — ${point.count} ${point.count === 1 ? 'event' : 'events'}`}
                onClick={() => toggleVenue(point.venueId)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  toggleVenue(point.venueId)
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  className={
                    isSelected
                      ? 'fill-blue-800 stroke-foreground dark:fill-blue-200'
                      : 'fill-blue-600 stroke-background dark:fill-blue-400'
                  }
                  strokeWidth={isSelected ? 2 : 1}
                />
                {!isNarrow && (
                  <text
                    x={labelX}
                    y={labelY + 5}
                    textAnchor={side === 'left' ? 'end' : 'start'}
                    fontSize={15}
                    className={
                      isSelected
                        ? 'fill-foreground font-semibold'
                        : 'fill-foreground'
                    }
                  >
                    {point.label} ({point.count})
                  </text>
                )}
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
      {isNarrow && points.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {points.map((point) => (
            <li key={point.venueId}>
              <button
                type="button"
                onClick={() => toggleVenue(point.venueId)}
                className="w-full rounded px-1 py-0.5 text-left hover:bg-muted"
              >
                {point.label}{' '}
                <span className="text-muted-foreground">
                  · {point.count} {point.count === 1 ? 'event' : 'events'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {unplaced > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {unplaced} {unplaced === 1 ? 'event is' : 'events are'} not shown — their
          venue has no location on record.
        </p>
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
