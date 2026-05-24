import { playerShortName } from '@/helpers/player-short-name'
import { useMemo } from 'react'
import { BarRace } from './bar-race'

type PlayerSnapshot = {
  date: string
  players: Array<{
    player_id: number
    name: string
    short_name: string | null
    rank: number
    total_points: number
    factions: Array<{ hex_code: string; faction_code: string }>
  }>
}

export function PlayersBarRace({ data }: { data: PlayerSnapshot[] }) {
  const barData = useMemo(
    () =>
      data.map((snapshot) => ({
        date: snapshot.date,
        items: snapshot.players.map((player) => ({
          id: String(player.player_id),
          value: player.total_points,
          name: player.name,
          short_name: playerShortName(player),
          hex_code: player.factions[0]?.hex_code ?? '#4A90D9',
          hex_codes: player.factions.map((f) => f.hex_code),
          rank: player.rank,
        })),
      })),
    [data],
  )
  return <BarRace data={barData} formatValue={(v) => v.toFixed(2)} />
}
