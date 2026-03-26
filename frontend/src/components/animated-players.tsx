import { useGetPlayersOverTimeTypeCode } from '@/api/hooks'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

export function PlayersBarRace({ typeCode }: { typeCode: string }) {
  const { data } = useGetPlayersOverTimeTypeCode(typeCode, {
    query: { enabled: !!typeCode },
  })

  const barData = useMemo(
    () =>
      (data ?? []).map((snapshot) => ({
        date: snapshot.date,
        items: snapshot.players.map((player) => ({
          id: String(player.player_id),
          value: player.total_points,
          name: player.name,
          short_name: player.name.split(' ')[0],
          hex_code: player.factions[0]?.hex_code ?? '#4A90D9',
          hex_codes: player.factions.map((faction) => faction.hex_code),
          rank: player.rank,
        })),
      })),
    [data],
  )

  return <BarRace data={barData} formatValue={(v) => v.toFixed(2)} />
}
