import { Table, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { useGetTourneyId } from '@/api/hooks'
import { Link } from '@/components/link'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'

type TourneyPlayer = {
  place: number
  playerId: number
  playerName: string
  points: number
  factionName: string
}

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/site/_site-pages/event/$id')({
  component: RouteComponent,
  params: eventParamsValidator,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const tourneyDetail = useGetTourneyId(String(id))
  if (!tourneyDetail.data) {
    return <div>Loading...</div>
  }
  return (
    <div>
      <Title order={1} mb="md">
        {(tourneyDetail.data.tourney as { name: string }).name}
      </Title>
      <Table
        tabularNums
        data={{
          head: ['Place', 'Name', 'Points', 'Faction'],
          body: (tourneyDetail.data.players as TourneyPlayer[]).map((row) => [
            row.place,
            <Link to={PlayerRoute.to} params={{ id: row.playerId }} search={{ tab: undefined }}>
              {row.playerName}
            </Link>,
            row.points.toFixed(2),
            row.factionName,
          ]),
        }}
      />
    </div>
  )
}
