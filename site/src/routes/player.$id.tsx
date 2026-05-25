import {
  fetchPlayer,
  fetchPlayerRankingHistory,
  fetchPlayerTeams,
  fetchPlayerTourneys,
  fetchPlayerPaintingWins,
  fetchRankingTypes,
} from '#/queries'
import { createFileRoute, notFound } from '@tanstack/react-router'
import z from 'zod'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { PaintingLightbox, positionLabel } from '#/components/painting-lightbox'
import { formatDate } from 'date-fns'
import { PlayerRankingOverTime } from '#/components/charts'

export const Route = createFileRoute('/player/$id')({
  params: z.object({ id: z.coerce.number() }),
  validateSearch: z.object({
    typeCode: z.string().default('ROLLING_YEAR'),
    tab: z.string().default('events'),
    painting: z.coerce.number().optional(),
  }),
  loader: async ({ params, location }) => {
    const searchParams = new URLSearchParams(location.search)
    const typeCode = searchParams.get('typeCode') ?? 'ROLLING_YEAR'
    const [player, rankingTypes, rankingsData, tourneys, teams, paintingWins] = await Promise.all([
      fetchPlayer({ data: { id: params.id } }),
      fetchRankingTypes(),
      fetchPlayerRankingHistory({ data: { playerId: params.id, typeCode } }),
      fetchPlayerTourneys({ data: { playerId: params.id } }),
      fetchPlayerTeams({ data: { playerId: params.id } }),
      fetchPlayerPaintingWins({ data: { playerId: params.id } }),
    ])
    if (!player) throw notFound()
    return { player, rankingTypes, rankingsData, tourneys, teams, paintingWins, typeCode }
  },
  head: ({ loaderData }) => loaderData ? ({
    meta: [
      { title: `${loaderData.player.name} — b(UK)et bot` },
      { property: 'og:title', content: loaderData.player.name },
      { property: 'og:description', content: `Player profile for ${loaderData.player.name}` },
    ],
  }) : {},
  component: RouteComponent,
})

function RouteComponent() {
  const { player, rankingTypes, rankingsData, tourneys, teams, paintingWins, typeCode } = Route.useLoaderData()
  const { painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const wins = paintingWins ?? []

  const activeWinner = activePaintingId ? wins.find((w: any) => w.id === activePaintingId) ?? null : null
  const activeWinnerForLightbox = activeWinner ? {
    id: activeWinner.id,
    imageKey: activeWinner.imageKey,
    playerName: player.name,
    playerId: player.id,
    model: activeWinner.model,
    description: activeWinner.description,
    categoryName: activeWinner.categoryName,
    position: activeWinner.position,
    totalWinners: activeWinner.totalWinners,
  } : null

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{player.name}</h2>
      <Tabs defaultValue="events">
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
          <Tabs.Tab value="teams">Teams</Tabs.Tab>
          {wins.length > 0 && <Tabs.Tab value="painting">Painting</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="events">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-2 py-2 font-semibold">Event</th>
                <th className="px-2 py-2 font-semibold">Points</th>
                <th className="px-2 py-2 font-semibold">Place</th>
                <th className="px-2 py-2 font-semibold">Faction</th>
                <th className="px-2 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {(tourneys as any[]).map((t: any) => (
                <tr key={t.tourneyId} className="border-b border-gray-100">
                  <td className="px-2 py-1.5">
                    <Link to="/event/$id" params={{ id: t.tourneyId }} search={{ tab: undefined, painting: undefined }}>
                      {t.tourneyName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-right">{t.points.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{t.place}</td>
                  <td className="px-2 py-1.5">{t.factionName}</td>
                  <td className="px-2 py-1.5">
                    {t.date ? formatDate(new Date(t.date), 'd MMMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>

        <Tabs.Panel value="rankings">
          <select
            className="w-[200px] rounded border border-gray-300 px-2 py-1 text-sm"
            value={typeCode}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, typeCode: e.target.value || undefined }) })}
          >
            {rankingTypes.map((rt) => (
              <option key={rt.code} value={rt.code}>{rt.name}</option>
            ))}
          </select>
          {rankingsData.rankings.length > 0 ? (
            <PlayerRankingOverTime rankingsData={rankingsData as any} />
          ) : (
            <div>No ranking data available for {rankingTypes.find((rt) => rt.code === typeCode)?.name}.</div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="teams">
          {teams.length === 0 ? (
            <div>No team history.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-2 py-2 font-semibold">Team</th>
                  <th className="px-2 py-2 font-semibold">Joined</th>
                  <th className="px-2 py-2 font-semibold">Left</th>
                  <th className="px-2 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {(teams as any[]).map((m: any) => (
                  <tr key={m.membership_id ?? m.team_id} className="border-b border-gray-100">
                    <td className="px-2 py-1.5">
                      <Link to="/team/$id" params={{ id: String(m.team_id) }} search={{ tab: undefined }}>
                        {m.team_name}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">{m.join_date ? formatDate(new Date(m.join_date), 'd MMMM yyyy') : '—'}</td>
                    <td className="px-2 py-1.5">{m.left_date ? formatDate(new Date(m.left_date), 'd MMMM yyyy') : 'Current'}</td>
                    <td className="px-2 py-1.5">
                      {m.is_captain && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                          Captain
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="painting">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-2 py-2 font-semibold" />
                <th className="px-2 py-2 font-semibold">Event</th>
                <th className="px-2 py-2 font-semibold">Category</th>
                <th className="px-2 py-2 font-semibold">Position</th>
                <th className="px-2 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((w: any) => (
                <tr key={w.id} className="border-b border-gray-100">
                  <td className="px-2 py-1.5">
                    {w.imageKey ? (
                      <img
                        src={`${import.meta.env.VITE_ASSETS_URL}/${w.imageKey}-w150.png`}
                        alt={w.categoryName}
                        className="w-20 cursor-pointer rounded-sm"
                        onClick={() => navigate({ search: (prev) => ({ ...prev, painting: w.id }) })}
                      />
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <Link to="/event/$id" params={{ id: w.tourneyId }} search={{ tab: 'best-painted', painting: undefined }}>
                      {w.tourneyName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{w.categoryName}</td>
                  <td className="px-2 py-1.5">{positionLabel(w.position, w.totalWinners)}</td>
                  <td className="px-2 py-1.5">
                    {w.tourneyDate ? formatDate(new Date(w.tourneyDate), 'd MMMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>
      </Tabs>

      <PaintingLightbox
        winner={activeWinnerForLightbox}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
      />
    </div>
  )
}
