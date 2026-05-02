import { Badge, Image, Select, Table, Tabs, Title } from '@mantine/core'

type PlayerTourneyItem = {
  tourneyId: number
  tourneyName: string
  points: number
  place: number
  factionName: string
  date: string
}
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

import { LazyPlayerRankingOverTimeChart } from '@/components/charts'
import { Link } from '@/components/link'
import { PaintingLightbox, positionLabel } from '@/components/painting-lightbox'
import {
  useGetPlayerId,
  useGetPlayerIdPaintingWins,
  useGetPlayerIdTeams,
  useGetRankingTypes,
  useGetRankingsPlayerIdTypeCode,
  useGetTourneysPlayerPlayerId,
} from '@/api/hooks'
import { Route as EventRoute } from '@/routes/site/_site-pages/event.$id'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'
import { formatDate } from 'date-fns'
import { Suspense } from 'react'

export const Route = createFileRoute('/site/_site-pages/player/$id')({
  validateSearch: z.object({
    typeCode: z.string().default('ROLLING_YEAR'),
    tab: z.string().default('events'),
    painting: z.coerce.number().optional(),
  }),

  component: RouteComponent,
  params: z.object({ id: z.coerce.number() }),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const rankingTypes = useGetRankingTypes()
  const { typeCode, tab, painting: activePaintingId } = Route.useSearch()
  const rankingsData = useGetRankingsPlayerIdTypeCode(String(id), typeCode, { query: { enabled: !!typeCode } })
  const playerData = useGetPlayerId(String(id))
  const navigate = Route.useNavigate()
  const tourneys = useGetTourneysPlayerPlayerId(String(id))
  const teams = useGetPlayerIdTeams(String(id))
  const paintingWins = useGetPlayerIdPaintingWins(String(id))

  if (!playerData.data) return <div>Loading...</div>

  const wins = paintingWins.data ?? []
  const activeWinner = activePaintingId
    ? wins.find((w) => w.id === activePaintingId) ?? null
    : null
  const activeWinnerForLightbox = activeWinner
    ? {
        id: activeWinner.id,
        imageKey: activeWinner.imageKey,
        playerName: playerData.data.name,
        playerId: id,
        model: activeWinner.model,
        description: activeWinner.description,
        categoryName: activeWinner.categoryName,
        position: activeWinner.position,
        totalWinners: activeWinner.totalWinners,
      }
    : null

  return (
    <div>
      <Title order={3} mb="md">
        {playerData.data.name}{' '}
      </Title>
      <Tabs
        defaultValue="events"
        value={tab}
        onChange={(value) => {
          if (value) navigate({ search: (prev) => ({ ...prev, tab: value }) })
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
          <Tabs.Tab value="teams">Teams</Tabs.Tab>
          {wins.length > 0 && <Tabs.Tab value="painting">Painting</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="events">
          {tourneys.data ? (
            <div>
              <Table
                tabularNums
                data={{
                  body: (tourneys.data as PlayerTourneyItem[]).map((tourney) => [
                    <Link
                      to={EventRoute.to}
                      params={{ id: tourney.tourneyId }}
                      search={{ tab: undefined }}
                    >
                      {tourney.tourneyName}
                    </Link>,
                    <div style={{ textAlign: 'right' }}>
                      {tourney.points.toFixed(2)}
                    </div>,
                    tourney.place,
                    tourney.factionName,
                    formatDate(new Date(tourney.date), 'd MMMM yyyy'),
                  ]),
                  head: ['Event', 'Points', 'Place', 'Faction', 'Date'],
                }}
              />
            </div>
          ) : (
            'Loading...'
          )}
        </Tabs.Panel>

        <Tabs.Panel value="rankings">
          <Select
            searchable
            w={200}
            placeholder="Choose a ranking"
            data={rankingTypes.data?.map((rt) => ({
              value: rt.code,
              label: rt.name,
            }))}
            value={typeCode}
            onChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, typeCode: value ?? undefined }),
              })
            }
          />

          {rankingsData.data && rankingsData.data.rankings.length > 0 ? (
            <Suspense fallback={<div>Loading chart...</div>}>
              <LazyPlayerRankingOverTimeChart
                rankingsData={rankingsData.data}
              />
            </Suspense>
          ) : (
            <div>
              No ranking data available for{' '}
              {rankingTypes.data?.find((rt) => rt.code === typeCode)?.name}.
            </div>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="teams">
          {teams.data ? (
            teams.data.length === 0 ? (
              <div>No team history.</div>
            ) : (
              <Table
                data={{
                  head: ['Team', 'Joined', 'Left', ''],
                  body: teams.data.map((m) => [
                    <Link
                      to={TeamRoute.to}
                      params={{ id: String(m.team_id) }}
                      search={{ tab: undefined }}
                    >
                      {m.team_name}
                    </Link>,
                    m.join_date
                      ? formatDate(new Date(m.join_date), 'd MMMM yyyy')
                      : '—',
                    m.left_date
                      ? formatDate(new Date(m.left_date), 'd MMMM yyyy')
                      : 'Current',
                    m.is_captain ? <Badge size="sm">Captain</Badge> : null,
                  ]),
                }}
              />
            )
          ) : (
            'Loading...'
          )}
        </Tabs.Panel>
        <Tabs.Panel value="painting">
          <Table
              data={{
                head: ['', 'Event', 'Category', 'Position', 'Date'],
                body: wins.map((w) => [
                  w.imageKey ? (
                    <Image
                      src={`${import.meta.env.VITE_ASSETS_URL}/${w.imageKey}-w150.png`}
                      alt={`${w.categoryName} — ${w.tourneyName}`}
                      radius="sm"
                      w={80}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        navigate({ search: (prev) => ({ ...prev, painting: w.id }) })
                      }
                    />
                  ) : null,
                  <Link
                    to={EventRoute.to}
                    params={{ id: w.tourneyId }}
                    search={{ tab: 'best-painted' }}
                  >
                    {w.tourneyName}
                  </Link>,
                  w.categoryName,
                  positionLabel(w.position, w.totalWinners),
                  w.tourneyDate
                    ? formatDate(new Date(w.tourneyDate), 'd MMMM yyyy')
                    : '—',
                ]),
              }}
            />
        </Tabs.Panel>
      </Tabs>

      <PaintingLightbox
        winner={activeWinnerForLightbox}
        onClose={() =>
          navigate({ search: (prev) => ({ ...prev, painting: undefined }) })
        }
      />
    </div>
  )
}
