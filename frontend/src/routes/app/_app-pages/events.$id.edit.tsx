import { useGetTourneyDetail } from '@/hooks/useApi'
import { Table, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

const eventParamsValidator = z.object({ id: z.string() })

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: RouteComponent,
  params: eventParamsValidator,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const tourneyDetail = useGetTourneyDetail(id)
  return (
    <div>
      <Title order={1} mb="md">
        {tourneyDetail.data ? tourneyDetail.data.tourney.name : `Event #${id}`}
      </Title>
      {tourneyDetail.data ? (
        <Table
          tabularNums
          data={{
            head: ['Place', 'Name', 'Points', 'Faction'],
            body: tourneyDetail.data.players.map((row) => [
              row.place,
              row.playerName,
              row.points.toFixed(2),
              row.factionName,
            ]),
          }}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
