import { fetchRankingTypes, fetchTeamRankings, fetchTeamsOverTime } from '#/queries'
import { TeamAvatar } from '#/components/team-avatar'
import { Tooltip } from '#/components/ui/tooltip'
import { useMediaQuery } from '#/helpers/use-media-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { TeamsBarRace } from '#/components/animated-teams'
import z from 'zod'
import { SITE_NAME, seo } from '#/helpers/seo'

function RankChange({ change, isNew }: { change: number | null | undefined; isNew?: boolean }) {
  if (isNew) return <span className="text-sm text-green-600">NEW</span>
  if (change == null) return <span className="text-sm text-blue-600">RE</span>
  if (change === 0) return <span className="text-sm text-gray-500">-</span>
  if (change > 0) return <span className="text-sm text-green-600">↑{change}</span>
  return <span className="text-sm text-red-600">↓{Math.abs(change)}</span>
}

export const Route = createFileRoute('/team-rankings')({
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Team Rankings' },
  beforeLoad: (context) => {
    if (!context.search.typeCode)
      throw redirect({ to: '/team-rankings', search: { typeCode: 'ROLLING_YEAR' } })
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search)
    const typeCode = params.get('typeCode') ?? 'ROLLING_YEAR'
    const [rankingTypes, rankings, teamsOverTime] = await Promise.all([
      fetchRankingTypes(),
      fetchTeamRankings({ data: { typeCode } }),
      fetchTeamsOverTime({ data: { typeCode } }),
    ])
    return { rankingTypes, rankings, teamsOverTime, typeCode }
  },
  head: () =>
    seo({
      title: `Team Rankings — ${SITE_NAME}`,
      description: 'UK Malifaux team rankings — rolling-year leaderboard.',
      path: '/team-rankings',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { rankingTypes, rankings, teamsOverTime, typeCode } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const isMd = useMediaQuery('(min-width: 992px)')
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
          <p className="mb-2 text-sm text-gray-500">
            Team ranking points are calculated as the sum of the ranking points of the top five players in the team.
          </p>
          <div
            className="overflow-x-auto"
            style={
              !isMd
                ? {
                    maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                  }
                : {}
            }
          >
            <table className="min-w-full text-sm tabular-nums">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-left">
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Rank</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Change</th>
                  <th className="px-2 py-2 font-semibold">Logo</th>
                  <th className="px-2 py-2 font-semibold">Team</th>
                  <th className="px-2 py-2 font-semibold">Total Points</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Players</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Events</th>
                </tr>
              </thead>
              <tbody>
                {(rankings as any[]).map((team: any) => (
                  <tr key={team.team_id} className="border-b border-gray-100">
                    <td className="whitespace-nowrap px-2 py-1.5">{team.rank}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <RankChange change={team.rank_change} isNew={team.new_team} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Tooltip label={team.team_name}>
                        <TeamAvatar image_key={team.image_key} name={team.team_name} />
                      </Tooltip>
                    </td>
                    <td className="px-2 py-1.5">
                      <Link to="/team/$id" params={{ id: String(team.team_id) }} search={{ tab: undefined }}>
                        {team.team_name}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">{team.total_points.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {team.player_count != null ? `${team.player_count}/5` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {team.event_count != null ? `${team.event_count}/25` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <TeamsBarRace data={teamsOverTime as any} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
