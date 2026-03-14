import { useGetFactionsOverTime } from '@/hooks/useApi'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

type Metric = 'declarations' | 'points_per_declaration' | 'total_points'

type FactionDatum = {
  faction_code: string
  declarations: number
  points_per_declaration: number
  total_points: number
  name: string
  short_name: string
  hex_code: string
}

export function FactionsBarRace({
  metric = 'points_per_declaration',
}: {
  metric?: Metric
}) {
  const { data } = useGetFactionsOverTime()

  const barData = useMemo(
    () =>
      (data ?? []).map((snap) => ({
        date: snap.date,
        items: snap.factions.map((f: FactionDatum) => ({
          ...f,
          id: f.faction_code,
          value: f[metric],
        })),
      })),
    [data, metric],
  )

  const formatValue = useMemo(
    () =>
      metric === 'declarations' || metric === 'total_points'
        ? (v: number) => Math.round(v).toString()
        : (v: number) => v.toFixed(2),
    [metric],
  )

  return <BarRace data={barData} formatValue={formatValue} />
}
