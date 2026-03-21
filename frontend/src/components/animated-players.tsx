import { useGetPlayersOverTimeTypeCode } from '@/api/hooks'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

export function PlayersBarRace({ typeCode }: { typeCode: string }) {
  const { data } = useGetPlayersOverTimeTypeCode(typeCode, {
    query: { enabled: !!typeCode },
  })

  const barData = useMemo(
    () =>
      (data ?? []).map((snap) => ({
        date: snap.date,
        items: snap.players.map((p) => ({
          id: String(p.player_id),
          value: p.total_points,
          name: p.name,
          short_name: p.name.split(' ')[0],
          hex_code: p.factions[0]?.hex_code ?? '#4A90D9',
          hex_codes: p.factions.map((f) => f.hex_code),
          rank: p.rank,
        })),
      })),
    [data],
  )

  return <BarRace data={barData} formatValue={(v) => v.toFixed(2)} />
}
