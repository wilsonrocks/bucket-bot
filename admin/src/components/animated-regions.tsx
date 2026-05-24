import { ActionIcon, Box, Group, Text } from '@mantine/core'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
} from '@tabler/icons-react'
import * as d3 from 'd3'
import { timeFormat } from 'd3-time-format'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RegionSnapshot } from '@/api/hooks'

type GeoJsonFeature = {
  type: string
  geometry: object
  properties: { rgn19nm: string; [key: string]: unknown }
}

type GeoJsonCollection = {
  type: string
  features: GeoJsonFeature[]
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
  return d3.interpolateRgb(COLORS[lower], COLORS[upper])(frac)
}

const formatDate = timeFormat('%d %b %Y')

type AnimatedRegionsProps = {
  snapshots: RegionSnapshot[]
  geoJson: GeoJsonCollection
  duration?: number
}

export function AnimatedRegions({
  snapshots,
  geoJson,
  duration = 750,
}: AnimatedRegionsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const hoveredNameRef = useRef<((name: string | null) => void) | null>(null)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
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

  const displayedDate = useMemo(() => {
    const cur = snapshots[frame]
    if (!cur) return ''
    const next = snapshots[Math.min(frame + 1, snapshots.length - 1)]
    const dateA = new Date(cur.date)
    const dateB = new Date(next.date)
    const interpTime = dateA.getTime() + (dateB.getTime() - dateA.getTime()) * t
    return formatDate(new Date(interpTime))
  }, [frame, t, snapshots])

  // Set up SVG paths (runs once when geoJson loads)
  useEffect(() => {
    if (!geoJson || !svgRef.current) return

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
    const projection = d3.geoMercator().fitSize([width, height], ukBbox)
    const pathGen = d3.geoPath().projection(projection)

    const svg = d3.select(svgRef.current)
    svg
      .selectAll<SVGPathElement, GeoJsonFeature>('path')
      .data(geoJson.features)
      .join('path')
      .attr('d', (d) => pathGen(d as d3.GeoPermissibleObjects) ?? '')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseenter', (_event, d) => {
        hoveredNameRef.current?.(d.properties.rgn19nm)
      })
      .on('mouseleave', () => {
        hoveredNameRef.current?.(null)
      })
  }, [geoJson, width, height])

  // Update fills on each animation tick
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, GeoJsonFeature>('path')
      .attr('fill', (d) => getColor(countMap.get(d.properties.rgn19nm) ?? 0))
  }, [countMap])

  return (
    <div
      style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseLeave={() => setMousePos(null)}
    >
      <Group mb={10} align="center">
        <strong>{displayedDate}</strong>
        <ActionIcon
          onClick={handleReset}
          variant="subtle"
          disabled={!canAnimate}
        >
          <IconPlayerSkipBack size={16} />
        </ActionIcon>
        <ActionIcon
          onClick={handlePlayPause}
          variant="subtle"
          disabled={!canAnimate}
        >
          {isPlaying ? (
            <IconPlayerPause size={16} />
          ) : (
            <IconPlayerPlay size={16} />
          )}
        </ActionIcon>
      </Group>
      <svg
        ref={svgRef}
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
          {hoveredRegion}
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
        <Group
          key={count}
          gap={8}
          align="center"
          wrap="nowrap"
          justify="flex-end"
        >
          <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
            {label}
          </Text>
          <Box
            w={20}
            h={28}
            style={{
              backgroundColor: COLORS[count],
              flexShrink: 0,
              borderTop: i === 0 ? '1px solid #000' : 'none',
              borderLeft: '1px solid #000',
              borderRight: '1px solid #000',
              borderBottom:
                i === LEGEND_ITEMS.length - 1 ? '1px solid #000' : 'none',
            }}
          />
        </Group>
      ))}
    </div>
  )
}
