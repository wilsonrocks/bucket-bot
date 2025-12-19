import { useGetAllTourneys } from '@/hooks/useApi'
import { Anchor, Button, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'
import { Link } from '@/components/link'

export const Route = createFileRoute('/app/_app-pages/events/')({
  component: RouteComponent,
})

function RouteComponent() {
  const tourneys = useGetAllTourneys()

  return (
    <div>
      <Button component={Link} to="new-longshanks">
        New Longshanks Event
      </Button>

      {tourneys.data ? (
        <Table
          data={{
            caption: 'Events',
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
    </div>
  )
}
