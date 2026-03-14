import { ActionIcon, Group } from '@mantine/core'
import { useMediaQuery, useResizeObserver } from '@mantine/hooks'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
} from '@tabler/icons-react'
import * as d3 from 'd3'
import { timeFormat } from 'd3-time-format'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export type BarDatum = {
  id: string
  value: number
  name: string
  short_name: string
  hex_code: string
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

function sortItems<T extends BarDatum>(items: T[]) {
  return [...items].sort((a, b) => b.value - a.value)
}

function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
) {
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
  const margin = { top: 20, right: 60, bottom: 20, left: isMobile ? 40 : 150 }
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
    const t = (data.length - 1) * duration
    offsetRef.current = t
    setTimeElapsed(t)
  }, [data])

  useEffect(() => {
    if (!isPlaying) return
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
  }, [data, isPlaying])

  function handlePlayPause() {
    const endTime = (data.length - 1) * duration
    if (!isPlaying && timeElapsed >= endTime) {
      offsetRef.current = 0
      setTimeElapsed(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((p) => !p)
    }
  }

  function handleReset() {
    offsetRef.current = 0
    setTimeElapsed(0)
    setIsPlaying(false)
  }

  const fractionalFrame = useMemo(() => {
    if (data.length === 0) return { frame: 0, t: 0 }
    const n = data.length
    const rawFrame = timeElapsed / duration
    const frame = Math.min(Math.floor(rawFrame), n - 1)
    const t = frame >= n - 1 ? 0 : rawFrame % 1
    return { frame, t }
  }, [timeElapsed, data])

  const interpolated = useMemo(() => {
    if (data.length === 0) return []
    const { t } = fractionalFrame
    const n = data.length
    const rawFrame = timeElapsed / duration
    const frame = Math.min(Math.floor(rawFrame), n - 1)
    const i0 = Math.max(frame - 1, 0)
    const i1 = frame
    const i2 = Math.min(frame + 1, n - 1)
    const i3 = Math.min(frame + 2, n - 1)

    if (!data[i1]) return []

    const baseItems =
      data[i1].items.length > 0 ? data[i1].items : data[i2].items

    return baseItems.map((f1) => {
      const get = (snap: Snapshot<T>) =>
        snap.items.find((f) => f.id === f1.id)?.value ?? 0
      const animated = catmullRom(
        get(data[i0]),
        get(data[i1]),
        get(data[i2]),
        get(data[i3]),
        t,
      )
      return { ...f1, value: animated }
    })
  }, [fractionalFrame, data])

  const sorted = useMemo(() => sortItems(interpolated), [interpolated])

  const xScale = useMemo(() => {
    const max = d3.max(data, (s) => d3.max(s.items, (f) => f.value)) || 1
    return d3.scaleLinear().domain([0, max]).range([0, innerWidth])
  }, [data, innerWidth])

  const makeYScale = (items: BarDatum[]) =>
    d3
      .scaleBand<string>()
      .domain(sortItems(items).map((d) => d.id))
      .range([0, innerHeight])
      .padding(0.1)

  const yScale = useMemo(() => makeYScale(sorted), [sorted, innerHeight])

  const positions = useMemo(() => {
    if (data.length === 0) return []
    const { t } = fractionalFrame
    const n = data.length
    const frame = Math.min(Math.floor(timeElapsed / duration), n - 1)
    if (!data[frame]) return []
    const yA = makeYScale(data[frame].items)
    const yB = makeYScale(data[Math.min(frame + 1, n - 1)].items)
    return sorted.map((d) => {
      const y0 = yA(d.id) ?? 0
      const y1 = yB(d.id) ?? 0
      return { ...d, y: y0 + (y1 - y0) * t }
    })
  }, [fractionalFrame, sorted, data, innerHeight])

  const displayedDate = useMemo(() => {
    if (data.length === 0) return ''
    const { t } = fractionalFrame
    const n = data.length
    const frame = Math.min(Math.floor(timeElapsed / duration), n - 1)
    if (!data[frame]) return ''
    const a = new Date(data[frame].date)
    const b = new Date(data[Math.min(frame + 1, n - 1)].date)
    const interpTime = a.getTime() + (b.getTime() - a.getTime()) * t
    const format = timeFormat('%d %b %Y')
    return format(new Date(interpTime))
  }, [fractionalFrame, data])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const g = svg.select<SVGGElement>('g.chart')

    const bars = g
      .selectAll<SVGGElement, BarDatum>('g.bar')
      .data(positions, (d: any) => d.id)

    const barsEnter = bars.enter().append('g').attr('class', 'bar')
    barsEnter.append('rect').attr('height', yScale.bandwidth())
    barsEnter.append('text').attr('class', 'label').attr('dy', '0.35em')
    barsEnter.append('text').attr('class', 'value').attr('dy', '0.35em')

    const merged = barsEnter.merge(bars as any)
    merged.attr('transform', (d) => `translate(0,${d.y})`)

    merged
      .select('rect')
      .attr('width', (d) => xScale(d.value))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => d.hex_code)

    merged
      .select('.label')
      .attr('x', -10)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .text((d) => (isMobile ? d.short_name : d.name))

    merged
      .select('.value')
      .attr('x', (d) => {
        const barW = Math.min(xScale(d.value), innerWidth)
        return barW > innerWidth - 50 ? barW - 6 : barW + 6
      })
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', (d) => {
        const barW = Math.min(xScale(d.value), innerWidth)
        return barW > innerWidth - 50 ? 'end' : 'start'
      })
      .attr('fill', (d) => {
        const barW = Math.min(xScale(d.value), innerWidth)
        return barW > innerWidth - 50 ? 'white' : 'currentColor'
      })
      .text((d) => formatValue(d.value))

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
