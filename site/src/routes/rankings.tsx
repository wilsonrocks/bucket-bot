import { fetchRankingTypes, fetchRankings, fetchPlayersOverTime } from '#/queries'
import { playerShortName } from '#/helpers/player-short-name'
import { TeamAvatar } from '#/components/team-avatar'
import { Tooltip } from '#/components/ui/tooltip'
import { useMediaQuery } from '#/helpers/use-media-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { PlayersBarRace } from '#/components/animated-players'
import z from 'zod'
import { SITE_NAME, seo } from '#/helpers/seo'

function RankChange({ change, newPlayer }: { change: number | null | undefined; newPlayer?: boolean }) {
  if (newPlayer) return <span className="text-sm text-green-600">NEW</span>
  if (change == null) return <span className="text-sm text-blue-600">RE</span>
  if (change === 0) return <span className="text-sm text-gray-500">-</span>
  if (change > 0) return <span className="text-sm text-green-600">↑{change}</span>
  return <span className="text-sm text-red-600">↓{Math.abs(change)}</span>
}

export const Route = createFileRoute('/rankings')({
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Rankings' },
  beforeLoad: (context) => {
    if (!context.search.typeCode)
      throw redirect({ to: '/rankings', search: { typeCode: 'ROLLING_YEAR' } })
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search)
    const typeCode = params.get('typeCode') ?? 'ROLLING_YEAR'
    const [rankingTypes, rankings, playersOverTime] = await Promise.all([
      fetchRankingTypes(),
      fetchRankings({ data: { typeCode } }),
      fetchPlayersOverTime({ data: { typeCode } }),
    ])
    return { rankingTypes, rankings, playersOverTime, typeCode }
  },
  head: () =>
    seo({
      title: `Rankings — ${SITE_NAME}`,
      description:
        'UK Malifaux player rankings — rolling-year leaderboard of competitive results.',
      path: '/rankings',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { rankingTypes, rankings, playersOverTime, typeCode } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const isMobile = useMediaQuery('(max-width: 600px)')

  const rankingDescription = rankingTypes.find((rt) => rt.code === typeCode)?.description

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <select
          className="w-[200px] rounded border border-gray-300 px-2 py-1 text-sm"
          value={typeCode}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, typeCode: e.target.value || undefined }) })}
        >
          {rankingTypes.map((rt) => (
            <option key={rt.code} value={rt.code}>{rt.name}</option>
          ))}
        </select>
        {rankingDescription && <p>{rankingDescription}</p>}
      </div>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          <table className="min-w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200 text-left">
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Rank</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Change</th>
                <th className="px-2 py-2 font-semibold">Player</th>
                <th className="px-2 py-2 font-semibold">Total Points</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player) => (
                <tr key={player.id} className="border-b border-gray-100">
                  <td className="whitespace-nowrap px-2 py-1.5">{player.rank}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <RankChange change={player.rank_change} newPlayer={player.new_player} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Link
                        to="/player/$id"
                        params={{ id: player.player_id! }}
                        search={{ tab: undefined, typeCode: undefined, painting: undefined }}
                      >
                        {isMobile ? playerShortName(player) : player.name}
                      </Link>
                      {player.current_team_id != null && (
                        <Tooltip label={player.current_team_name}>
                          <Link
                            to="/team/$id"
                            params={{ id: String(player.current_team_id) }}
                            search={{ tab: undefined }}
                          >
                            <TeamAvatar
                              image_key={player.team_image_key}
                              name={player.current_team_name ?? '?'}
                              size={22}
                            />
                          </Link>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">{(player.total_points ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <p className="mt-1 text-sm text-gray-500">Showing top 16 players</p>
          <PlayersBarRace data={playersOverTime as any} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
