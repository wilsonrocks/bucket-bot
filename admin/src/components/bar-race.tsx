import { ActionIcon, Group } from '@mantine/core'
import { useMediaQuery, useResizeObserver } from '@mantine/hooks'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
} from '@tabler/icons-react'
import { max, scaleBand, scaleLinear, select } from 'd3'
import { timeFormat } from 'd3-time-format'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export type BarDatum = {
  id: string
  value: number
  name: string
  short_name: string
  hex_code: string
  hex_codes?: string[]
  rank: number
}

// Fraction of each run's width that blends into adjacent colours on each side.
// e.g. 0.2 means 20% blend on each end → 60% solid in the middle.
const BLEND_FRACTION = 0.2

type GradientStop = { offset: string; color: string }

function toGradientStops(hex_codes: string[]): GradientStop[] {
  if (hex_codes.length === 0) return []
  const total = hex_codes.length
  const runs: { color: string; start: number; end: number }[] = []
  let i = 0
  while (i < total) {
    const color = hex_codes[i]
    let j = i
    while (j < total && hex_codes[j] === color) j++
    runs.push({ color, start: i / total, end: j / total })
    i = j
  }

  if (runs.length === 1) {
    return [{ offset: '0%', color: runs[0].color }, { offset: '100%', color: runs[0].color }]
  }

  const stops: GradientStop[] = [{ offset: '0%', color: runs[0].color }]

  for (let i = 0; i < runs.length - 1; i++) {
    const left = runs[i]
    const right = runs[i + 1]
    const boundary = left.end
    const blendStart = boundary - BLEND_FRACTION * (left.end - left.start)
    const blendEnd = boundary + BLEND_FRACTION * (right.end - right.start)
    stops.push({ offset: `${(blendStart * 100).toFixed(4)}%`, color: left.color })
    stops.push({ offset: `${(blendEnd * 100).toFixed(4)}%`, color: right.color })
  }

  stops.push({ offset: '100%', color: runs[runs.length - 1].color })
  return stops
}

export type Snapshot<T extends BarDatum = BarDatum> = {
  date: string
  items: T[]
}

type BarRaceProps<T extends BarDatum> = {
  data: Snapshot<T>[]
  formatValue?: (v: number) => string
  duration?: number
}

const formatDate = timeFormat('%d %b %Y')

function sortItems<T extends BarDatum>(items: T[]) {
  return [...items].sort((a, b) => b.value - a.value)
}

function makeYScale(items: BarDatum[], innerHeight: number) {
  return scaleBand<string>()
    .domain(sortItems(items).map((d) => d.id))
    .range([0, innerHeight])
    .padding(0.1)
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

function BarRaceInner<T extends BarDatum>({
  data,
  formatValue = (v) => v.toFixed(2),
  duration = 1500,
}: BarRaceProps<T>) {
  const [containerRef, containerRect] = useResizeObserver<HTMLDivElement>()
  const isMobile = useMediaQuery('(max-width: 600px)')
  const width = containerRect.width || 700
  const height = 400
  const margin = { top: 20, right: 100, bottom: 20, left: 30 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const svgRef = useRef<SVGSVGElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const offsetRef = useRef(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || data.length === 0) return
    initialized.current = true
    const endTime = (data.length - 1) * duration
    offsetRef.current = endTime
    setTimeElapsed(endTime)
  }, [data])

  useEffect(() => {
    if (!isPlaying) return
    const frameCount = data.length
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
  }, [data, isPlaying])

  function handlePlayPause() {
    const endTime = (data.length - 1) * duration
    if (!isPlaying && timeElapsed >= endTime) {
      offsetRef.current = 0
      setTimeElapsed(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }

  function handleReset() {
    offsetRef.current = 0
    setTimeElapsed(0)
    setIsPlaying(false)
  }

  const fractionalFrame = useMemo(() => {
    if (data.length === 0) return { frame: 0, t: 0 }
    const frameCount = data.length
    const rawFrame = timeElapsed / duration
    const frame = Math.min(Math.floor(rawFrame), frameCount - 1)
    const t = frame >= frameCount - 1 ? 0 : rawFrame % 1
    return { frame, t }
  }, [timeElapsed, data])

  const interpolated = useMemo(() => {
    if (data.length === 0) return []
    const { frame, t } = fractionalFrame
    const frameCount = data.length
    const iPrev = Math.max(frame - 1, 0)
    const iCur = frame
    const iNext = Math.min(frame + 1, frameCount - 1)
    const iFar = Math.min(frame + 2, frameCount - 1)

    if (!data[iCur]) return []

    // Union of players from adjacent frames so entering/exiting bars animate smoothly
    const seenIds = new Set<string>()
    const baseItems: T[] = []
    for (const snap of [data[iPrev], data[iCur], data[iNext]]) {
      for (const item of snap.items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          // Prefer metadata from current frame; fall back to wherever we found the player
          baseItems.push(data[iCur].items.find((d) => d.id === item.id) ?? item)
        }
      }
    }

    return baseItems
      .map((item) => {
        const getValue = (snap: Snapshot<T>) =>
          snap.items.find((candidate) => candidate.id === item.id)?.value ?? 0
        const animated = catmullRom(
          getValue(data[iPrev]),
          getValue(data[iCur]),
          getValue(data[iNext]),
          getValue(data[iFar]),
          t,
        )
        return { ...item, value: animated }
      })
      .filter((item) => item.value > 0)
  }, [fractionalFrame, data])

  const sorted = useMemo(() => sortItems(interpolated), [interpolated])

  const xScale = useMemo(() => {
    const maxVal =
      max(data, (snapshot) => max(snapshot.items, (d) => d.value)) || 1
    return scaleLinear().domain([0, maxVal]).range([0, innerWidth])
  }, [data, innerWidth])

  const yScale = useMemo(
    () => makeYScale(sorted, innerHeight),
    [sorted, innerHeight],
  )

  const positions = useMemo(() => {
    if (data.length === 0) return []
    const { frame, t } = fractionalFrame
    const frameCount = data.length
    if (!data[frame]) return []
    const yScaleCur = makeYScale(data[frame].items, innerHeight)
    const yScaleNext = makeYScale(
      data[Math.min(frame + 1, frameCount - 1)].items,
      innerHeight,
    )
    return sorted.map((d) => {
      // Fall back to innerHeight (bottom) so entering/exiting bars slide in/out from the bottom
      const y0 = yScaleCur(d.id) ?? innerHeight
      const y1 = yScaleNext(d.id) ?? innerHeight
      return { ...d, y: y0 + (y1 - y0) * t }
    })
  }, [fractionalFrame, sorted, data, innerHeight])

  const displayedDate = useMemo(() => {
    if (data.length === 0) return ''
    const { frame, t } = fractionalFrame
    const frameCount = data.length
    if (!data[frame]) return ''
    const dateA = new Date(data[frame].date)
    const dateB = new Date(data[Math.min(frame + 1, frameCount - 1)].date)
    const interpTime = dateA.getTime() + (dateB.getTime() - dateA.getTime()) * t
    return formatDate(new Date(interpTime))
  }, [fractionalFrame, data])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const g = svg.select<SVGGElement>('g.chart')

    // Sync gradient defs
    let defs = svg.select<SVGDefsElement>('defs')
    if (defs.empty()) defs = svg.insert('defs', ':first-child')

    const grads = defs
      .selectAll<SVGLinearGradientElement, BarDatum>('linearGradient')
      .data(positions, (d: BarDatum) => d.id)

    const gradsEnter = grads.enter().append('linearGradient')
    gradsEnter
      .attr('id', (d) => `grad-${d.id}`)
      .attr('gradientUnits', 'objectBoundingBox')

    gradsEnter.merge(grads as any).each(function (d) {
      const stops = d.hex_codes && d.hex_codes.length > 0
        ? toGradientStops(d.hex_codes)
        : [{ offset: '0%', color: d.hex_code }, { offset: '100%', color: d.hex_code }]
      select(this).selectAll('stop').remove()
      select(this).selectAll('stop').data(stops).enter().append('stop')
        .attr('offset', (s) => s.offset)
        .attr('stop-color', (s) => s.color)
    })

    grads.exit().remove()

    const bars = g
      .selectAll<SVGGElement, BarDatum>('g.bar')
      .data(positions, (d: BarDatum) => d.id)

    const barsEnter = bars.enter().append('g').attr('class', 'bar')
    barsEnter.append('rect').attr('height', yScale.bandwidth())
    barsEnter.append('text').attr('class', 'rank').attr('dy', '0.35em')
    barsEnter.append('text').attr('class', 'value').attr('dy', '0.35em')

    const merged = barsEnter.merge(bars as any)
    merged.attr('transform', (d) => `translate(0,${d.y})`)

    merged
      .select('rect')
      .attr('width', (d) => xScale(d.value))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => `url(#grad-${d.id})`)

    merged
      .select('.rank')
      .attr('x', -6)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('fill', 'black')
      .text((d) => d.rank)

    merged
      .select('.value')
      .attr('x', (d) => {
        const barWidth = Math.min(xScale(d.value), innerWidth)
        return barWidth > innerWidth - 50 ? barWidth - 6 : barWidth + 6
      })
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', (d) => {
        const barWidth = Math.min(xScale(d.value), innerWidth)
        return barWidth > innerWidth - 50 ? 'end' : 'start'
      })
      .attr('fill', (d) => {
        const barWidth = Math.min(xScale(d.value), innerWidth)
        return barWidth > innerWidth - 50 ? 'white' : 'currentColor'
      })
      .text(
        (d) => `${isMobile ? d.short_name : d.name} (${formatValue(d.value)})`,
      )

    bars.exit().remove()
  }, [positions, xScale, yScale, isMobile, formatValue])

  return (
    <div ref={containerRef}>
      <Group mb={10} align="center">
        <strong>{displayedDate}</strong>
        <ActionIcon onClick={handleReset} variant="subtle">
          <IconPlayerSkipBack size={16} />
        </ActionIcon>
        <ActionIcon onClick={handlePlayPause} variant="subtle">
          {isPlaying ? (
            <IconPlayerPause size={16} />
          ) : (
            <IconPlayerPlay size={16} />
          )}
        </ActionIcon>
      </Group>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g
          className="chart"
          transform={`translate(${margin.left},${margin.top})`}
        />
      </svg>
    </div>
  )
}

export const BarRace = React.memo(BarRaceInner, (prev, next) => {
  return (
    JSON.stringify(prev.data) === JSON.stringify(next.data) &&
    prev.formatValue === next.formatValue
  )
}) as typeof BarRaceInner
