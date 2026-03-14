import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { timeFormat } from 'd3-time-format'
import { ActionIcon, Group } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack } from '@tabler/icons-react'
import { useGetFactionsOverTime } from '@/hooks/useApi'

type FactionDatum = {
  faction_code: string
  declarations: number
  points_per_declaration: number
  name: string
  hex_code: string
}

type Snapshot = {
  date: string
  factions: FactionDatum[]
}

function sortFactions(factions: FactionDatum[]) {
  return [...factions].sort(
    (a, b) => b.points_per_declaration - a.points_per_declaration,
  )
}

export function FactionsBarRace() {
  const { data } = useGetFactionsOverTime()

  const [containerRef, containerRect] = useResizeObserver<HTMLDivElement>()
  const width = containerRect.width || 700
  const height = 400
  const margin = { top: 20, right: 60, bottom: 20, left: 150 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const svgRef = useRef<SVGSVGElement | null>(null)

  // --- Playback controls ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [startSignal, setStartSignal] = useState(0)
  const offsetRef = useRef(0)

  // --- Continuous time ---
  const duration = 1500 // ms per snapshot
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    if (!data || !isPlaying) return
    const n = data.length
    let raf: number
    const start = performance.now() - offsetRef.current

    function tick(now: number) {
      const elapsed = now - start
      const rawFrame = elapsed / duration
      if (rawFrame >= n - 1) {
        const endTime = (n - 1) * duration
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
  }, [data, isPlaying, startSignal])

  function handleReset() {
    offsetRef.current = 0
    setTimeElapsed(0)
    if (isPlaying) setStartSignal((s) => s + 1)
  }

  // --- Fractional frame ---
  const fractionalFrame = useMemo(() => {
    if (!data || data.length === 0) return { frame: 0, t: 0 }
    const n = data.length
    const rawFrame = timeElapsed / duration
    const frame = Math.min(Math.floor(rawFrame), n - 1)
    const t = frame >= n - 1 ? 0 : rawFrame % 1
    return { frame, t }
  }, [timeElapsed, data])

  // Catmull-Rom spline: interpolates between p1→p2 using neighbouring points for
  // smooth velocity at each keyframe (no velocity discontinuity = no pausing feel)
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

  // --- Interpolated bar data ---
  const interpolated = useMemo(() => {
    if (!data || data.length === 0) return []
    const { t } = fractionalFrame
    const n = data.length
    // Recompute frame directly from current timeElapsed/data to avoid stale frame
    const rawFrame = timeElapsed / duration
    const frame = Math.min(Math.floor(rawFrame), n - 1)
    const i0 = Math.max(frame - 1, 0)
    const i1 = frame
    const i2 = Math.min(frame + 1, n - 1)
    const i3 = Math.min(frame + 2, n - 1)

    if (!data[i1]) return []

    // If the current frame has no factions (e.g. a zero-placeholder first snapshot),
    // use the next frame's faction list so bars can tween up from zero.
    const baseFactions =
      data[i1].factions.length > 0 ? data[i1].factions : data[i2].factions

    return baseFactions.map((f1) => {
      const get = (snap: Snapshot) =>
        snap.factions.find((f) => f.faction_code === f1.faction_code)
          ?.points_per_declaration ?? 0
      return {
        ...f1,
        points_per_declaration: catmullRom(
          get(data[i0]),
          get(data[i1]),
          get(data[i2]),
          get(data[i3]),
          t,
        ),
      }
    })
  }, [fractionalFrame, data])

  const sorted = useMemo(() => sortFactions(interpolated), [interpolated])

  const xScale = useMemo(() => {
    const max =
      d3.max(data ?? [], (s) => d3.max(s.factions, (f) => f.points_per_declaration)) || 1
    return d3.scaleLinear().domain([0, max]).range([0, innerWidth])
  }, [data, innerWidth])

  const makeYScale = (factions: FactionDatum[]) =>
    d3
      .scaleBand<string>()
      .domain(sortFactions(factions).map((d) => d.faction_code))
      .range([0, innerHeight])
      .padding(0.1)

  // yScale based on current interpolated sort — used for bandwidth only
  const yScale = useMemo(() => makeYScale(sorted), [sorted, innerHeight])

  // --- y positions interpolated between current and next sort orders ---
  const positions = useMemo(() => {
    if (!data || data.length === 0) return []
    const { t } = fractionalFrame
    const n = data.length
    const frame = Math.min(Math.floor(timeElapsed / duration), n - 1)
    if (!data[frame]) return []
    const yA = makeYScale(data[frame].factions)
    const yB = makeYScale(data[Math.min(frame + 1, n - 1)].factions)
    return sorted.map((d) => {
      const y0 = yA(d.faction_code) ?? 0
      const y1 = yB(d.faction_code) ?? 0
      return { ...d, y: y0 + (y1 - y0) * t }
    })
  }, [fractionalFrame, sorted, data, innerHeight])

  // --- Interpolated date ---
  const displayedDate = useMemo(() => {
    if (!data || data.length === 0) return ''
    const { t } = fractionalFrame
    const n = data.length
    const frame = Math.min(Math.floor(timeElapsed / duration), n - 1)
    if (!data[frame]) return ''
    const a = new Date(data[frame].date)
    const b = new Date(data[Math.min(frame + 1, n - 1)].date)
    const interpTime = a.getTime() + (b.getTime() - a.getTime()) * t
    const format = timeFormat('%d %b %Y') // e.g., 14 Mar 2026
    return format(new Date(interpTime))
  }, [fractionalFrame, data])

  // --- D3 rendering ---
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const g = svg.select<SVGGElement>('g.chart')

    const bars = g
      .selectAll<SVGGElement, FactionDatum>('g.bar')
      .data(positions, (d: any) => d.faction_code)

    const barsEnter = bars.enter().append('g').attr('class', 'bar')
    barsEnter.append('rect').attr('height', yScale.bandwidth())
    barsEnter.append('text').attr('class', 'label').attr('dy', '0.35em')
    barsEnter.append('text').attr('class', 'value').attr('dy', '0.35em')

    const merged = barsEnter.merge(bars as any)
    merged.attr('transform', (d) => `translate(0,${d.y})`)

    merged
      .select('rect')
      .attr('width', (d) => xScale(d.points_per_declaration))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => d.hex_code)

    merged
      .select('.label')
      .attr('x', -10)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .text((d) => d.name)

    merged
      .select('.value')
      .attr('x', (d) => xScale(d.points_per_declaration) + 6)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'start')
      .text((d) => d.points_per_declaration.toFixed(2))

    bars.exit().remove()
  }, [positions, xScale, yScale])

  return (
    <div ref={containerRef}>
      <Group mb={10} align="center">
        <strong>{displayedDate}</strong>
        <ActionIcon onClick={() => setIsPlaying((p) => !p)} variant="subtle">
          {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
        </ActionIcon>
        <ActionIcon onClick={handleReset} variant="subtle">
          <IconPlayerSkipBack size={16} />
        </ActionIcon>
      </Group>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          className="chart"
          transform={`translate(${margin.left},${margin.top})`}
        />
      </svg>
    </div>
  )
}
