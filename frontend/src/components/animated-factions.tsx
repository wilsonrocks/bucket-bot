import { useGetFactionsOverTime } from '@/api/hooks'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

type Metric = 'declarations' | 'points_per_declaration' | 'total_points'

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
        items: snap.factions.map((f) => ({
          ...f,
          short_name: f.short_name ?? '',
          id: f.faction_code,
          value: f[metric] ?? 0,
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
