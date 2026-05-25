import { useMemo } from 'react'
import { BarRace } from './bar-race'

type TeamSnapshot = {
  date: string
  teams: Array<{
    team_id: number
    team_name: string
    total_points: number
    rank: number
    brand_colour: string | null
  }>
}

const formatValue = (v: number) => Math.round(v).toString()

export function TeamsBarRace({ data }: { data: TeamSnapshot[] }) {
  const barData = useMemo(
    () =>
      data.map((snap) => ({
        date: snap.date,
        items: snap.teams.map((t) => ({
          id: String(t.team_id),
          value: t.total_points,
          name: t.team_name,
          short_name: t.team_name,
          hex_code: t.brand_colour ?? '#4A90D9',
          rank: t.rank,
        })),
      })),
    [data],
  )
  return <BarRace data={barData} formatValue={formatValue} />
}
