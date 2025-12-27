import { Table, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { useGetTourneyDetail } from '@/hooks/useApi'
import { Link } from '@/components/link'

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/site/event/$id')({
  component: RouteComponent,
  params: eventParamsValidator,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const tourneyDetail = useGetTourneyDetail(id)
  if (!tourneyDetail.data) {
    return <div>Loading...</div>
  }
  return (
    <div>
      <Title order={1} mb="md">
        {tourneyDetail.data.tourney.name}
      </Title>
      <Table
        tabularNums
        data={{
          head: ['Place', 'Name', 'Points', 'Faction'],
          body: tourneyDetail.data.players.map((row) => [
            row.place,
            <Link to={`/site/player/${row.playerId}`}>{row.playerName}</Link>,

            row.points.toFixed(2),
            row.factionName,
          ]),
        }}
      />
    </div>
  )
}
