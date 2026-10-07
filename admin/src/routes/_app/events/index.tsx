import { Link } from '@/components/link'
import { useGetTourney as useGetAllTourneys } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Table } from '@mantine/core'
import { SortableTh, useTableSort } from '@/components/sortable-table'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from '../events.$id.edit'

export const Route = createFileRoute('/_app/events/')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: { title: 'Edit Events' },
})

function RouteComponent() {
  const tourneys = useGetAllTourneys()
  const { rows, getSortProps } = useTableSort(tourneys.data ?? [], {
    name: { value: (t) => t.name },
    date: { value: (t) => t.date, natural: 'desc' },
    players: { value: (t) => t.players, natural: 'desc' },
  })
  return (
    <div>
      {tourneys.data ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <SortableTh {...getSortProps('name')}>Name</SortableTh>
              <SortableTh {...getSortProps('date')}>Date</SortableTh>
              <SortableTh {...getSortProps('players')}>Players</SortableTh>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map(({ id, name, date, players }) => (
              <Table.Tr key={id}>
                <Table.Td>
                  <Link
                    search={{ tab: undefined }}
                    to={EventIdRoute.to}
                    params={{ id }}
                  >
                    {name}
                  </Link>
                </Table.Td>
                <Table.Td>{date ? format(parseISO(date), 'dd MMM yyyy') : ''}</Table.Td>
                <Table.Td>{players}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
