import { fetchRankingTypes, fetchRankings, fetchPlayersOverTime } from '#/queries'
import { playerShortName } from '#/helpers/player-short-name'
import { PlayerTeamIcon } from '#/components/player-team-icon'
import { useMediaQuery } from '#/helpers/use-media-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { PlayersBarRace } from '#/components/animated-players'
import { optionalFlag, optionalString } from '#/helpers/search-params'
import { SITE_NAME, seo } from '#/helpers/seo'
import { SortableTh, useTableSort } from '#/components/sortable-table'

function RankChange({ change, newPlayer }: { change: number | null | undefined; newPlayer?: boolean }) {
  if (newPlayer) return <span className="text-sm text-green-600 dark:text-green-400">NEW</span>
  if (change == null) return <span className="text-sm text-blue-600 dark:text-blue-400">RE</span>
  if (change === 0) return <span className="text-sm text-muted-foreground">-</span>
  if (change > 0) return <span className="text-sm text-green-600 dark:text-green-400">↑{change}</span>
  return <span className="text-sm text-red-600 dark:text-red-400">↓{Math.abs(change)}</span>
}

export const Route = createFileRoute('/rankings')({
  validateSearch: (search: Record<string, unknown>) => ({
    typeCode: optionalString(search.typeCode),
    minFiveEvents: optionalFlag(search.minFiveEvents),
  }),
  staticData: { title: 'Rankings' },
  beforeLoad: (context) => {
    if (!context.search.typeCode)
      throw redirect({ to: '/rankings', search: { ...context.search, typeCode: 'ROLLING_YEAR' } })
  },
  // Search params are only part of the loader's cache key if they're declared here,
  // otherwise switching ranking type reuses the stale loader data.
  loaderDeps: ({ search: { typeCode } }) => ({ typeCode: typeCode ?? 'ROLLING_YEAR' }),
  loader: async ({ deps: { typeCode } }) => {
    const [rankingTypes, rankings, playersOverTime] = await Promise.all([
      fetchRankingTypes(),
      fetchRankings({ data: { typeCode } }),
      fetchPlayersOverTime({ data: { typeCode } }),
    ])
    return { rankingTypes, rankings, playersOverTime }
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
  const { rankingTypes, rankings, playersOverTime } = Route.useLoaderData()
  const { typeCode = 'ROLLING_YEAR', minFiveEvents } = Route.useSearch()
  const navigate = Route.useNavigate()
  const isMobile = useMediaQuery('(max-width: 600px)')

  const rankingDescription = rankingTypes.find((rt) => rt.code === typeCode)?.description
  // Ranks are left as-is when filtering, so the gaps show who was dropped.
  const filtered = minFiveEvents ? rankings.filter((p) => Number(p.event_count ?? 0) >= 5) : rankings
  const { rows, getSortProps } = useTableSort(filtered, {
    rank: { value: (p) => p.rank },
    change: { value: (p) => (p.new_player ? null : p.rank_change), natural: 'desc' },
    player: { value: (p) => p.name },
    points: { value: (p) => p.total_points, natural: 'desc' },
    events: { value: (p) => Number(p.event_count ?? 0), natural: 'desc' },
  })

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <select
          className="w-[200px] rounded border border-border px-2 py-1 text-sm"
          value={typeCode}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, typeCode: e.target.value || undefined }) })}
        >
          {rankingTypes.map((rt) => (
            <option key={rt.code} value={rt.code}>{rt.name}</option>
          ))}
        </select>
        {rankingDescription && <p>{rankingDescription}</p>}
        <label className="flex w-fit cursor-pointer items-center gap-2 whitespace-nowrap text-sm sm:ml-auto">
          <input
            type="checkbox"
            checked={!!minFiveEvents}
            onChange={(e) =>
              navigate({ search: (prev) => ({ ...prev, minFiveEvents: e.target.checked || undefined }), replace: true })
            }
          />
          5+ events only
        </label>
      </div>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          <table className="max-w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-left">
                {/* Every column is sized, so toggling the filter can't resize the table.
                    The table is no longer stretched to full width, otherwise the slack
                    would all land on Player and leave it enormous on a wide screen. */}
                <SortableTh className="w-16" {...getSortProps('rank')}>Rank</SortableTh>
                <SortableTh className="w-20" {...getSortProps('change')}>Change</SortableTh>
                <SortableTh className="w-64" {...getSortProps('player')}>Player</SortableTh>
                <SortableTh className="w-28" {...getSortProps('points')}>Total Points</SortableTh>
                <SortableTh className="hidden w-20 min-[601px]:table-cell" {...getSortProps('events')}>
                  Events
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((player) => (
                <tr key={player.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-2 py-1.5">{player.rank}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <RankChange change={player.rank_change} newPlayer={player.new_player} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Link
                        to="/player/$id"
                        params={{ id: player.player_id! }}
                        search={{ tab: undefined, typeCode: undefined, painting: undefined, achievement: undefined }}
                      >
                        {isMobile ? playerShortName(player) : player.name}
                      </Link>
                      <PlayerTeamIcon
                        team_id={player.current_team_id}
                        team_name={player.current_team_name}
                        image_key={player.team_image_key}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">{(player.total_points ?? 0).toFixed(2)}</td>
                  <td className="hidden px-2 py-1.5 min-[601px]:table-cell">{Number(player.event_count ?? 0)}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No players have five or more events in this ranking.</p>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <p className="mt-1 text-sm text-muted-foreground">Showing top 16 players</p>
          <PlayersBarRace data={playersOverTime as any} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
