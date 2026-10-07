import { useGetPlayers } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Link } from '@/components/link'
import { Avatar, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Route as PlayerEditRoute } from './$id'
import { SortableTh, useTableSort } from '@/components/sortable-table'

export const Route = createFileRoute('/_app/players/')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Players' },
})

function RouteComponent() {
  const { data: players } = useGetPlayers()
  const { rows, getSortProps } = useTableSort(players ?? [], {
    name: { value: (p) => p.name },
    discord: { value: (p) => p.discord_username },
  })

  if (!players) return <div>Loading...</div>

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Avatar</Table.Th>
          <SortableTh {...getSortProps('name')}>Name</SortableTh>
          <SortableTh {...getSortProps('discord')}>Discord Username</SortableTh>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((player) => (
          <Table.Tr key={player.id}>
            <Table.Td>
              <Avatar src={player.discord_avatar_url ?? undefined} size="sm" />
            </Table.Td>
            <Table.Td>
              <Link to={PlayerEditRoute.to} params={{ id: String(player.id) }} search={{ tab: undefined }}>
                {player.name}
              </Link>
            </Table.Td>
            <Table.Td>{player.discord_username ?? '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
