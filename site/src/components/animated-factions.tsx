import { useMemo } from 'react'
import { BarRace } from './bar-race'

type Metric = 'declarations' | 'points_per_declaration' | 'total_points'

type FactionSnapshot = {
  date: string
  factions: Array<{
    faction_code: string
    declarations: number | null
    points_per_declaration: number | null
    total_points: number | null
    name: string
    hex_code: string
    short_name: string | null
  }>
}

export function FactionsBarRace({ data, metric = 'points_per_declaration' }: { data: FactionSnapshot[]; metric?: Metric }) {
  const barData = useMemo(
    () =>
      data.map((snap) => {
        const items = snap.factions.map((f) => ({
          ...f,
          short_name: f.short_name ?? '',
          id: f.faction_code,
          value: (f[metric] as number | null) ?? 0,
        }))
        const sorted = [...items].sort((a, b) => b.value - a.value)
        const rankMap = new Map<string, number>()
        let rank = 1
        for (let i = 0; i < sorted.length; i++) {
          if (i > 0 && sorted[i].value < sorted[i - 1].value) rank = i + 1
          rankMap.set(sorted[i].id, rank)
        }
        return {
          date: snap.date,
          items: items.map((item) => ({ ...item, rank: rankMap.get(item.id)! })),
        }
      }),
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
