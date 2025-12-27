import { Tabs } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { useGetRankingsForPlayer } from '@/hooks/useApi'

export const Route = createFileRoute('/site/player/$id')({
  component: RouteComponent,
  params: z.object({ id: z.coerce.number() }),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const rankingsData = useGetRankingsForPlayer(id, 'BEST_FOREVER')

  return (
    <div>
      <Tabs defaultValue="events">
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </div>
  )
}
