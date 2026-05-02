import { useGetPlayers } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Link } from '@/components/link'
import { Avatar, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Route as PlayerEditRoute } from './$id'

export const Route = createFileRoute('/app/_app-pages/players/')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Players' },
})

function RouteComponent() {
  const { data: players } = useGetPlayers()

  if (!players) return <div>Loading...</div>

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Avatar</Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Discord Username</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {players.map((player) => (
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
