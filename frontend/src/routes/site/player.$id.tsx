import { Select, Table, Tabs, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { LineChart } from '@mantine/charts'

import {
  useGetAllTourneys,
  useGetPlayerById,
  useGetRankingTypes,
  useGetRankingsForPlayer,
  useGetTourneysForPlayer,
} from '@/hooks/useApi'
import { formatDate } from 'date-fns'
import { Link } from '@/components/link'
import { Route as EventRoute } from '@/routes/site/event.$id'

export const Route = createFileRoute('/site/player/$id')({
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
  const rankingsData = useGetRankingsForPlayer(id, typeCode)
  const playerData = useGetPlayerById(id)
  const navigate = Route.useNavigate()
  const tourneys = useGetTourneysForPlayer(id)

  if (!playerData.data) return <div>Loading...</div>
  return (
    <div>
      <Title order={3} mb="md">
        {playerData.data?.name}{' '}
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
        </Tabs.List>

        <Tabs.Panel value="events">
          {tourneys.data ? (
            <div>
              <Table
                tabularNums
                data={{
                  body: tourneys.data.map((tourney) => [
                    <Link
                      to={EventRoute.path}
                      // params={{ id: String(tourney.tourneyId) }}
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
              navigate({ search: (prev) => ({ ...prev, typeCode: value }) })
            }
          />

          {rankingsData.data && rankingsData.data.rankings.length > 0 ? (
            <LineChart
              h={300}
              dataKey="date"
              data={rankingsData.data.rankings.map((row) => ({
                date: formatDate(new Date(row.created_at), 'MM/dd/yyyy'),
                rank: row.rank,
              }))}
              series={[{ name: 'rank', label: 'Rank' }]}
              yAxisProps={{
                domain: [1, rankingsData.data.metadata.number_of_players],
                reversed: true,
                ticks: [
                  1,
                  ...Array.from(
                    {
                      length: rankingsData.data.metadata.number_of_players / 10,
                    },
                    (_, i) => (i + 1) * 10,
                  ),
                ],
              }}
            />
          ) : (
            <div>
              No ranking data available for{' '}
              {rankingTypes.data?.find((rt) => rt.code === typeCode)?.name}.
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
