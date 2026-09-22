import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RegionEventsModal, RegionEventsPanel } from '#/components/region-events'
import type { RegionEvent } from '#/components/animated-regions'
import { UK_BBOX } from '#/data/uk-bbox'
import type { UkRegionFeature } from '#/data/uk-regions-geo'

export type TownPoint = {
  /** Stable identity for the group — see `townKey`. */
  key: string
  /** The town, or the venue's name where the venue has no town recorded. */
  label: string
  /** Centre of the town's venues. */
  lon: number
  lat: number
  count: number
  events: RegionEvent[]
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

/**
 * Events are grouped by town rather than by venue, because a dot stands for a
 * place: two venues in one town belong on one dot, under one name. `venue.town`
 * is NOT NULL but may still be blank, and a venue with an unusable town keeps a
 * dot of its own rather than being lumped in with every other nameless one.
 */
function townKey(event: RegionEvent): string {
  const town = event.town.trim()
  return town ? `town:${town.toLowerCase()}` : `venue:${event.venueId}`
}

/**
 * Roll the flat event list up into one point per town, over the same rolling year
 * the choropleth's final frame shades. Events at a venue that was never geocoded
 * can't be placed, so they're reported separately rather than silently dropped.
 */
export function aggregateTowns(
  events: RegionEvent[],
  windowEnd: string,
): { points: TownPoint[]; unplaced: number } {
  const start = new Date(windowEnd)
  start.setFullYear(start.getFullYear() - 1)
  const windowStart = isoDate(start)

  type Group = Omit<TownPoint, 'lon' | 'lat'> & {
    /** Coordinates per venue, so a town with two venues counts each one once. */
    venues: Map<number, [number, number]>
  }
  const byTown = new Map<string, Group>()
  let unplaced = 0

  for (const event of events) {
    if (event.date < windowStart || event.date > windowEnd) continue
    if (event.lon == null || event.lat == null) {
      unplaced++
      continue
    }
    const key = townKey(event)
    const existing = byTown.get(key)
    if (existing) {
      existing.count++
      existing.events.push(event)
      existing.venues.set(event.venueId, [event.lon, event.lat])
      continue
    }
    byTown.set(key, {
      key,
      label: event.town.trim() || event.venueName || 'Unknown',
      count: 1,
      events: [event],
      venues: new Map([[event.venueId, [event.lon, event.lat]]]),
    })
  }

  const points = [...byTown.values()].map(({ venues, ...group }) => {
    // The venues of one town sit a street apart, so their mean is a fair enough
    // spot for the town — and it's exact for the usual single-venue case.
    const coords = [...venues.values()]
    return {
      ...group,
      lon: coords.reduce((sum, [lon]) => sum + lon, 0) / coords.length,
      lat: coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length,
    }
  })

  // Biggest first so the busiest towns paint underneath the smaller ones rather
  // than hiding them.
  return { points: points.sort((a, b) => b.count - a.count), unplaced }
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
/** Width the map falls back to before it has been measured. */
const DEFAULT_WIDTH = 820
/** Below this the labels drop their counts and shrink, to keep the gutters narrow. */
const NARROW_PX = 640

/**
 * Everything about the labels is specified in CSS pixels and converted into
 * viewBox units against the measured width, never written in viewBox units
 * directly: a viewBox length is scaled by however much the map was fitted to the
 * page by, which would shrink the gaps between labels on exactly the screens
 * where they're already tightest.
 */
export function labelMetrics(containerWidth: number) {
  const narrow = containerWidth < NARROW_PX
  // Never let the gutters eat the map itself, however cramped it gets: capping
  // each at a share of the width leaves the map at least 44% of the box.
  const gutterPx = Math.min(narrow ? 92 : 150, containerWidth * 0.28)
  const mapPx = containerWidth - gutterPx * 2
  const unitsPerPx = MAP_W / mapPx
  return {
    narrow,
    gutter: gutterPx * unitsPerPx,
    /** How wide a label may grow before wrapping, in CSS pixels. */
    gutterPx,
    // Narrow labels wrap rather than run off the screen, so they have to be
    // allowed the height of two lines.
    /** Vertical clearance between stacked labels. */
    labelGap: (narrow ? 30 : 21) * unitsPerPx,
    /** Gap between a label and the map edge. */
    labelInset: 10 * unitsPerPx,
    /** Length of the horizontal run of a leader line, next to its label. */
    elbow: 22 * unitsPerPx,
  }
}

type LaidOutPoint = {
  point: TownPoint
  x: number
  y: number
  side: 'left' | 'right'
  labelY: number
}

type TownPointsMapProps = {
  events: RegionEvent[]
  /** YYYY-MM-DD; the window shown is the year ending here. */
  windowEnd: string
}

export function TownPointsMap({ events, windowEnd }: TownPointsMapProps) {
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

  const [selectedTown, setSelectedTown] = useState<string | null>(null)

  // The label layout is driven by how wide the map actually ended up, not by a
  // media query: the same component is narrow in a sidebar and wide on a phone in
  // landscape, and only the element knows which.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH)
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) setContainerWidth(width)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { narrow, gutter, gutterPx, labelGap, labelInset, elbow } = useMemo(
    () => labelMetrics(containerWidth),
    [containerWidth],
  )

  const { points, unplaced } = useMemo(
    () => aggregateTowns(events, windowEnd),
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
    const sides: Record<'left' | 'right', Array<{ point: TownPoint; x: number; y: number }>> = {
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
        labelGap,
        labelGap / 2,
        MAP_H - labelGap / 2,
      )
      return column.map((c, i) => ({ ...c, side, labelY: ys[i] }))
    })
  }, [points, projection, labelGap])

  const selected = points.find((p) => p.key === selectedTown) ?? null

  function toggleTown(key: string) {
    setSelectedTown((prev) => (prev === key ? null : key))
  }

  const viewBoxW = MAP_W + gutter * 2

  /** A viewBox x/y as a percentage of the SVG box, for positioning HTML over it. */
  const pctX = (x: number) => ((x + gutter) / viewBoxW) * 100
  const pctY = (y: number) => (y / MAP_H) * 100

  return (
    <figure className="mx-auto" style={{ maxWidth: DEFAULT_WIDTH }}>
      <figcaption className="mb-2 text-lg font-semibold">
        UK Events in last 12 months
      </figcaption>
      {/*
        Nothing but the map and its labels belongs in this box: the labels are
        positioned as percentages of it, so anything else inside — a caption, the
        events panel — would stretch it and drag every label out of line with the
        leader line it belongs to.

        No maxHeight, for the same reason: the SVG has to fill the box exactly
        for those percentages to land where the lines end.
      */}
      <div ref={containerRef} className="relative">
        <svg
          data-testid="town-points-map"
          viewBox={`${-gutter} 0 ${viewBoxW} ${MAP_H}`}
          width="100%"
          className="block"
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
          <g className="stroke-muted-foreground" strokeWidth={1} fill="none">
            {laidOut.map(({ point, x, y, side, labelY }) => {
              const labelX = side === 'left' ? -labelInset : MAP_W + labelInset
              const elbowX = side === 'left' ? labelX + elbow : labelX - elbow
              return (
                <polyline
                  key={point.key}
                  points={`${x},${y} ${elbowX},${labelY} ${labelX},${labelY}`}
                />
              )
            })}
          </g>
          <g>
            {laidOut.map(({ point, x, y }) => {
              // Area, not radius, carries the count — a 4-event town should look
              // four times the size of a 1-event one, not four times as wide.
              const r = 4 + 3 * Math.sqrt(point.count)
              const isSelected = point.key === selectedTown
              return (
                // Purely a click target: every town's gutter label is a real
                // <button>, so giving the dot its own tab stop would just duplicate
                // it in the a11y tree.
                <g
                  key={point.key}
                  cursor="pointer"
                  aria-hidden
                  data-town={point.key}
                  onClick={() => toggleTown(point.key)}
                >
                  {/*
                    A dot is only ~11px across once the map is fitted to a phone,
                    well under a comfortable tap target, so the visible circle sits
                    on a bigger invisible one.
                  */}
                  <circle cx={x} cy={y} r={Math.max(r + 8, 18)} fill="transparent" />
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
                </g>
              )
            })}
          </g>
        </svg>
        {/*
          The labels are HTML rather than SVG <text> so they render at a real CSS
          font size. Inside the SVG they'd scale with the viewBox, which left them
          around 11px once the map was fitted to the page.
        */}
        {laidOut.map(({ point, side, labelY }) => {
          const isSelected = point.key === selectedTown
          const labelX = side === 'left' ? -labelInset : MAP_W + labelInset
          return (
            <button
              key={point.key}
              type="button"
              onClick={() => toggleTown(point.key)}
              // Wide labels already read the count out; narrow ones drop it, so
              // spell it out for anyone not looking at the map.
              aria-label={
                narrow
                  ? `${point.label} — ${point.count} ${point.count === 1 ? 'event' : 'events'}`
                  : undefined
              }
              className={`absolute leading-tight hover:underline ${
                narrow ? 'text-xs' : 'whitespace-nowrap text-base'
              } ${side === 'left' ? 'text-right' : 'text-left'} ${
                isSelected ? 'font-semibold' : ''
              }`}
              style={{
                left: `${pctX(labelX)}%`,
                top: `${pctY(labelY)}%`,
                transform: `translate(${side === 'left' ? '-100%' : '0'}, -50%)`,
                // A long name would otherwise run off a phone screen entirely.
                maxWidth: narrow ? gutterPx : undefined,
              }}
            >
              {point.label}
              {/* The count needs a gutter of its own; too tight to spare on a phone. */}
              {!narrow && (
                <>
                  {' '}
                  <span className="text-muted-foreground">({point.count})</span>
                </>
              )}
            </button>
          )
        })}
      </div>
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
      {selected &&
        // Below the map is off-screen on a phone, so a tapped dot would look
        // like it had done nothing.
        (narrow ? (
          <RegionEventsModal
            title={selected.label}
            events={selected.events}
            windowEnd={windowEnd}
            onClose={() => setSelectedTown(null)}
          />
        ) : (
          <RegionEventsPanel
            title={selected.label}
            events={selected.events}
            windowEnd={windowEnd}
            onClose={() => setSelectedTown(null)}
          />
        ))}
    </figure>
  )
}
