import { PlayerTeamIcon } from '#/components/player-team-icon'
import { Link } from '#/components/link'

type RankingEntry = {
  player_id: number | null
  name: string
  short_name: string | null
  total_points: number | null
  current_team_id: number | null
  current_team_name: string | null
  team_image_key: string | null
}

export function TopPlayersCard({ data }: { data: RankingEntry[] }) {
  const top5 = data.slice(0, 5)

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Top Players</h3>
      <div className="flex-1">
        <table className="min-w-full text-sm">
          <tbody>
            {top5.map((player, i) => (
              <tr key={player.player_id} className="border-b border-border last:border-0">
                <td className="w-8 py-1.5 text-muted-foreground">#{i + 1}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {player.player_id != null ? (
                      <Link
                        to="/player/$id"
                        params={{ id: player.player_id }}
                        search={{ tab: undefined, typeCode: undefined, painting: undefined }}
                      >
                        {player.name}
                      </Link>
                    ) : (
                      <span className="text-sm">{player.name}</span>
                    )}
                    <PlayerTeamIcon
                      team_id={player.current_team_id}
                      team_name={player.current_team_name}
                      image_key={player.team_image_key}
                    />
                  </div>
                </td>
                <td className="py-1.5 text-right text-muted-foreground">
                  {(player.total_points ?? 0).toFixed(0)} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link to="/rankings" search={{ typeCode: 'ROLLING_YEAR' }} className="mt-2 text-sm">
        Full rankings →
      </Link>
    </div>
  )
}
