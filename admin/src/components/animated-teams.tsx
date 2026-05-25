import { useGetTeamsOverTimeTypeCode } from '@/api/hooks'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

const formatValue = (v: number) => Math.round(v).toString()

export function TeamsBarRace({ typeCode }: { typeCode: string }) {
  const { data } = useGetTeamsOverTimeTypeCode(typeCode)

  const barData = useMemo(
    () =>
      (data ?? []).map((snap) => ({
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
