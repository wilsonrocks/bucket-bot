import { fetchPlayer, fetchPlayerRankingHistory, fetchPlayerTeams, fetchPlayerTourneys, fetchPlayerPaintingWins, fetchRankingTypes } from '@/queries'
import { Badge, Image, Select, Table, Tabs, Title } from '@mantine/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import z from 'zod'
import { lazy, Suspense } from 'react'
import { Link } from '@/components/link'
import { PaintingLightbox, positionLabel } from '@/components/painting-lightbox'
import { formatDate } from 'date-fns'

const LazyPlayerRankingOverTimeChart = lazy(() =>
  import('@/components/charts').then((m) => ({ default: m.LazyPlayerRankingOverTimeChart }))
)

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
  const { tab, painting: activePaintingId } = Route.useSearch()
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
      <Title order={3} mb="md">{player.name}</Title>
      <Tabs defaultValue="events" value={tab} onChange={(value) => { if (value) navigate({ search: (prev) => ({ ...prev, tab: value }) }) }}>
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
          <Tabs.Tab value="teams">Teams</Tabs.Tab>
          {wins.length > 0 && <Tabs.Tab value="painting">Painting</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="events">
          <Table tabularNums data={{
            head: ['Event', 'Points', 'Place', 'Faction', 'Date'],
            body: (tourneys as any[]).map((t: any) => [
              <Link to="/event/$id" params={{ id: t.tourneyId }} search={{ tab: undefined, painting: undefined }}>{t.tourneyName}</Link>,
              <div style={{ textAlign: 'right' }}>{t.points.toFixed(2)}</div>,
              t.place,
              t.factionName,
              t.date ? formatDate(new Date(t.date), 'd MMMM yyyy') : '—',
            ]),
          }} />
        </Tabs.Panel>

        <Tabs.Panel value="rankings">
          <Select
            searchable w={200} placeholder="Choose a ranking"
            data={rankingTypes.map((rt) => ({ value: rt.code, label: rt.name }))}
            value={typeCode}
            onChange={(value) => navigate({ search: (prev) => ({ ...prev, typeCode: value ?? undefined }) })}
          />
          {rankingsData.rankings.length > 0 ? (
            <Suspense fallback={<div>Loading chart...</div>}>
              <LazyPlayerRankingOverTimeChart rankingsData={rankingsData as any} />
            </Suspense>
          ) : (
            <div>No ranking data available for {rankingTypes.find((rt) => rt.code === typeCode)?.name}.</div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="teams">
          {teams.length === 0 ? <div>No team history.</div> : (
            <Table data={{
              head: ['Team', 'Joined', 'Left', ''],
              body: (teams as any[]).map((m: any) => [
                <Link to="/team/$id" params={{ id: String(m.team_id) }} search={{ tab: undefined }}>{m.team_name}</Link>,
                m.join_date ? formatDate(new Date(m.join_date), 'd MMMM yyyy') : '—',
                m.left_date ? formatDate(new Date(m.left_date), 'd MMMM yyyy') : 'Current',
                m.is_captain ? <Badge size="sm">Captain</Badge> : null,
              ]),
            }} />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="painting">
          <Table data={{
            head: ['', 'Event', 'Category', 'Position', 'Date'],
            body: wins.map((w: any) => [
              w.imageKey ? (
                <Image
                  src={`${import.meta.env.VITE_ASSETS_URL}/${w.imageKey}-w150.png`}
                  alt={`${w.categoryName}`}
                  radius="sm" w={80}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate({ search: (prev) => ({ ...prev, painting: w.id }) })}
                />
              ) : null,
              <Link to="/event/$id" params={{ id: w.tourneyId }} search={{ tab: 'best-painted', painting: undefined }}>{w.tourneyName}</Link>,
              w.categoryName,
              positionLabel(w.position, w.totalWinners),
              w.tourneyDate ? formatDate(new Date(w.tourneyDate), 'd MMMM yyyy') : '—',
            ]),
          }} />
        </Tabs.Panel>
      </Tabs>

      <PaintingLightbox
        winner={activeWinnerForLightbox}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
      />
    </div>
  )
}
