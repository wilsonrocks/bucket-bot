import { Anchor, Button, Table, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'
import { Route as NewLongshanksRoute } from './new-longshanks'
import { useGetAllTourneys } from '@/hooks/useApi'
import { Link } from '@/components/link'

export const Route = createFileRoute('/app/_app-pages/events/')({
  component: RouteComponent,
})

function RouteComponent() {
  const tourneys = useGetAllTourneys()
  return (
    <div>
      <Title order={1} mb="md">
        Events
      </Title>

      {tourneys.data ? (
        <Table
          data={{
            body: tourneys.data.map(
              ({ id, name, date, players, level_code }) => [
                <Anchor component={Link} to={EventIdRoute.path} params={{ id }}>
                  {name}
                </Anchor>,
                format(parseISO(date), 'dd MMM yyyy'),
                players,
                level_code,
              ],
            ),
            head: ['Name', 'Date', 'Players', 'Level'],
          }}
        />
      ) : (
        <div>Loading...</div>
      )}

      <Button component={Link} to={NewLongshanksRoute.path} mt="md">
        New Longshanks Event
      </Button>
    </div>
  )
}
