import { useGetAllTourneys } from '@/hooks/useApi'
import { Button, Table } from '@mantine/core'
import { Link, createFileRoute } from '@tanstack/react-router'
import { format, parse, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'

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
                <Link to={EventIdRoute.path} params={{ id }}>
                  {name}
                </Link>,
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
