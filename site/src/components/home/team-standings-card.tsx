import { TeamAvatar } from '#/components/team-avatar'
import { Link } from '#/components/link'
import { Tooltip } from '#/components/ui/tooltip'

type TeamRanking = {
  team_id: number
  team_name: string
  image_key: string | null
  rank: number
  total_points: number
}

export function TeamStandingsCard({ data }: { data: TeamRanking[] }) {
  const top5 = data.slice(0, 5)

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Team Standings</h3>
      <div className="flex-1">
        <table className="min-w-full text-sm">
          <tbody>
            {top5.map((team) => (
              <tr key={team.team_id} className="border-b border-border last:border-0">
                <td className="w-8 py-1.5 text-muted-foreground">#{team.rank}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Tooltip label={team.team_name}>
                      <Link
                        to="/team/$id"
                        params={{ id: String(team.team_id) }}
                        search={{ tab: undefined }}
                      >
                        <TeamAvatar image_key={team.image_key} name={team.team_name} />
                      </Link>
                    </Tooltip>
                    <Link
                      to="/team/$id"
                      params={{ id: String(team.team_id) }}
                      search={{ tab: undefined }}
                    >
                      {team.team_name}
                    </Link>
                  </div>
                </td>
                <td className="py-1.5 text-right text-muted-foreground">{team.total_points.toFixed(0)} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        to="/team-rankings"
        search={{ typeCode: 'ROLLING_YEAR' }}
        className="mt-2 text-sm"
      >
        Full team standings →
      </Link>
    </div>
  )
}
