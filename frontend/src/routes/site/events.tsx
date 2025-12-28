import { Link } from '@/components/link'
import { useGetAllTourneys, useGetRankingTypes } from '@/hooks/useApi'
import { Anchor, Input, Select, Table, Title } from '@mantine/core'
import { useInputState } from '@mantine/hooks'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from './event.$id'

export const Route = createFileRoute('/site/events')({
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
    </div>
  )
}
