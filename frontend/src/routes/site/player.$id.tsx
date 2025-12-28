import { Tabs } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { LineChart } from '@mantine/charts'

import { useGetRankingsForPlayer } from '@/hooks/useApi'

export const Route = createFileRoute('/site/player/$id')({
  component: RouteComponent,
  params: z.object({ id: z.coerce.number() }),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const rankingsData = useGetRankingsForPlayer(id, 'BEST_FOREVER')
  if (!rankingsData.data) return <div>Loading...</div>
  return (
    <div>
      <Tabs defaultValue="events">
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="rankings">
          <LineChart
            h={300}
            dataKey="date"
            data={rankingsData.data.rankings.map((row) => ({
              date: new Date(row.created_at),
              rank: row.rank,
            }))}
            series={[{ name: 'rank', label: 'Rank' }]}
            yAxisProps={{
              domain: [1, rankingsData.data.metadata.number_of_players],
              reversed: true,
              ticks: [
                1,
                ...Array.from(
                  { length: rankingsData.data.metadata.number_of_players / 10 },
                  (_, i) => (i + 1) * 10,
                ),
              ],
            }}
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
