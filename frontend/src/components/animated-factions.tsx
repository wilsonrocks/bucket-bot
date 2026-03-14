import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { timeFormat } from 'd3-time-format'
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

  const width = 700
  const height = 400
  const margin = { top: 20, right: 20, bottom: 20, left: 120 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const svgRef = useRef<SVGSVGElement | null>(null)

  // --- Continuous time ---
  const duration = 1500 // ms per snapshot
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    if (!data) return
    let raf: number
    const start = performance.now()

    function tick(now: number) {
      setTimeElapsed(now - start)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [data])

  // --- Fractional frame interpolation ---
  const fractionalFrame = useMemo(() => {
    if (!data) return { frameA: 0, frameB: 0, t: 0 }
    const totalFrames = data.length
    const frame = Math.floor(timeElapsed / duration)
    const t = (timeElapsed % duration) / duration
    const frameA = frame % totalFrames
    const frameB = (frame + 1) % totalFrames
    return { frameA, frameB, t }
  }, [timeElapsed, data])

  // --- Interpolated bar data ---
  const interpolated = useMemo(() => {
    if (!data) return []
    const { frameA, frameB, t } = fractionalFrame
    const a = data[frameA]
    const b = data[frameB]
    const mapB = new Map(b.factions.map((f) => [f.faction_code, f]))
    return a.factions.map((fa) => {
      const fb = mapB.get(fa.faction_code)!
      return {
        ...fa,
        points_per_declaration:
          fa.points_per_declaration +
          (fb.points_per_declaration - fa.points_per_declaration) * t,
      }
    })
  }, [fractionalFrame, data])

  const sorted = useMemo(() => sortFactions(interpolated), [interpolated])

  const xScale = useMemo(() => {
    const max = d3.max(sorted, (d) => d.points_per_declaration) ?? 1
    return d3.scaleLinear().domain([0, max]).range([0, innerWidth])
  }, [sorted, innerWidth])

  const makeYScale = (factions: FactionDatum[]) =>
    d3
      .scaleBand<string>()
      .domain(sortFactions(factions).map((d) => d.faction_code))
      .range([0, innerHeight])
      .padding(0.1)

  // yScale based on current interpolated sort — used for bandwidth only
  const yScale = useMemo(() => makeYScale(sorted), [sorted, innerHeight])

  // --- y positions interpolated between frameA and frameB sort orders ---
  const positions = useMemo(() => {
    if (!data) return []
    const { frameA, frameB, t } = fractionalFrame
    const yA = makeYScale(data[frameA].factions)
    const yB = makeYScale(data[frameB].factions)
    return sorted.map((d) => {
      const y0 = yA(d.faction_code) ?? 0
      const y1 = yB(d.faction_code) ?? 0
      return { ...d, y: y0 + (y1 - y0) * t }
    })
  }, [fractionalFrame, sorted, data, innerHeight])

  // --- Interpolated date ---
  const displayedDate = useMemo(() => {
    if (!data) return ''
    const { frameA, frameB, t } = fractionalFrame
    const a = new Date(data[frameA].date)
    const b = new Date(data[frameB].date)
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
    <div>
      <div style={{ marginBottom: 10 }}>
        <strong>{displayedDate}</strong>
      </div>
      <svg ref={svgRef} width={width} height={height}>
        <g
          className="chart"
          transform={`translate(${margin.left},${margin.top})`}
        />
      </svg>
    </div>
  )
}
