import { Badge, Select, Table, Tabs, Title } from '@mantine/core'

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
import {
  useGetPlayerId,
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
  }),

  component: RouteComponent,
  params: z.object({ id: z.coerce.number() }),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const rankingTypes = useGetRankingTypes()
  const { typeCode, tab } = Route.useSearch()
  const rankingsData = useGetRankingsPlayerIdTypeCode(String(id), typeCode, { query: { enabled: !!typeCode } })
  const playerData = useGetPlayerId(String(id))
  const navigate = Route.useNavigate()
  const tourneys = useGetTourneysPlayerPlayerId(String(id))
  const teams = useGetPlayerIdTeams(String(id))

  if (!playerData.data) return <div>Loading...</div>
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
                      search={{}}
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
                search: (
                  prev: Record<string, unknown>,
                ): Record<string, unknown> => ({ ...prev, typeCode: value }),
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
                      search={{}}
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
      </Tabs>
    </div>
  )
}
