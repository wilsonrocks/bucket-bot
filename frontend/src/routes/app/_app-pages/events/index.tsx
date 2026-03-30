import { Link } from '@/components/link'
import { useGetTourney as useGetAllTourneys } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'

export const Route = createFileRoute('/app/_app-pages/events/')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
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
              ({ id, name, date, players }) => [
                <Link
                  search={{ tab: undefined }}
                  to={EventIdRoute.to}
                  params={{ id }}
                >
                  {name}
                </Link>,
                date ? format(parseISO(date), 'dd MMM yyyy') : '',
                players,
              ],
            ),
            head: ['Name', 'Date', 'Players'],
          }}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
