import { Link } from '@/components/link'
import { useGetAllTourneys } from '@/hooks/useApi'
import { Anchor, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'

export const Route = createFileRoute('/app/_app-pages/events/')({
  component: RouteComponent,
  staticData: { title: 'Edit Events' },
})

function RouteComponent() {
  const tourneys = useGetAllTourneys()
  return (
    <div>
      {tourneys.data ? (
        <Table
          data={{
            body: tourneys.data.map(
              ({ id, name, date, players, level_code }) => [
                <Anchor component={Link} to={EventIdRoute.to} params={{ id }}>
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
