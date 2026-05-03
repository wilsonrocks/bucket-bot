import { Card, Skeleton, Title } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { scaleBand, scaleLinear } from 'd3'
import { Link } from '@/components/link'
import { useGetFactionRankings } from '@/api/hooks'
import { Route as FactionRankingsRoute } from '@/routes/site/_site-pages/faction-rankings'

const MARGIN = { top: 4, right: 90, bottom: 4, left: 24 }
const BAR_COUNT = 8

export function FactionCard() {
  const { data, isLoading } = useGetFactionRankings()
  const [containerRef, containerRect] = useResizeObserver<HTMLDivElement>()

  const top = data?.slice(0, BAR_COUNT) ?? []
  const width = containerRect.width || 300
  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = BAR_COUNT * 26
  const height = innerHeight + MARGIN.top + MARGIN.bottom

  const maxVal = Math.max(...top.map((f) => f.points_per_declaration ?? 0), 1)
  const xScale = scaleLinear().domain([0, maxVal]).range([0, innerWidth])
  const yScale = scaleBand<string>()
    .domain(top.map((f) => f.faction_code))
    .range([0, innerHeight])
    .padding(0.15)

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Faction Rankings</Title>
      <div style={{ flex: 1 }} ref={containerRef}>
        {isLoading ? (
          <Skeleton height={200} />
        ) : (
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {top.map((faction) => {
                const barWidth = xScale(faction.points_per_declaration ?? 0)
                const y = yScale(faction.faction_code) ?? 0
                const bh = yScale.bandwidth()
                const labelInside = barWidth > innerWidth - 60
                const value = (faction.points_per_declaration ?? 0).toFixed(2)

                return (
                  <g key={faction.faction_code} transform={`translate(0,${y})`}>
                    <text
                      x={-4}
                      y={bh / 2}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize={11}
                      fill="currentColor"
                      opacity={0.5}
                    >
                      {faction.rank}
                    </text>
                    <rect
                      width={barWidth}
                      height={bh}
                      fill={faction.hex_code ?? '#888'}
                      rx={2}
                    />
                    <text
                      x={labelInside ? barWidth - 5 : barWidth + 5}
                      y={bh / 2}
                      dy="0.35em"
                      textAnchor={labelInside ? 'end' : 'start'}
                      fontSize={11}
                      fill={labelInside ? 'white' : 'currentColor'}
                    >
                      {faction.faction_name} ({value})
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>
      <Link to={FactionRankingsRoute.to} search={{ tab: undefined }} size="sm" mt="sm">
        Full faction rankings →
      </Link>
    </Card>
  )
}
