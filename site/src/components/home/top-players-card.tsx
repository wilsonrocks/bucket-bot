import { Card, Group, Table, Text, Title, Tooltip } from '@mantine/core'
import { TeamAvatar } from '@/components/team-avatar'
import { Link } from '@/components/link'

type RankingEntry = {
  player_id: number | null
  name: string
  short_name: string | null
  total_points: number | null
  current_team_id: number | null
  current_team_name: string | null
  team_image_key: string | null
}

export function TopPlayersCard({ data }: { data: RankingEntry[] }) {
  const top5 = data.slice(0, 5)

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Top Players</Title>
      <div style={{ flex: 1 }}>
        <Table>
          <Table.Tbody>
            {top5.map((player, i) => (
              <Table.Tr key={player.player_id}>
                <Table.Td w={30} c="dimmed">#{i + 1}</Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    {player.player_id != null ? (
                      <Link to="/player/$id" params={{ id: player.player_id }} search={{ tab: undefined, typeCode: undefined, painting: undefined }}>
                        {player.name}
                      </Link>
                    ) : (
                      <Text size="sm">{player.name}</Text>
                    )}
                    {player.current_team_id != null && (
                      <Tooltip label={player.current_team_name} withArrow>
                        <Link to="/team/$id" params={{ id: String(player.current_team_id) }} search={{ tab: undefined }}>
                          <TeamAvatar image_key={player.team_image_key} name={player.current_team_name ?? '?'} size={20} />
                        </Link>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td ta="right" c="dimmed">{(player.total_points ?? 0).toFixed(0)} pts</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <Link to="/rankings" search={{ typeCode: 'ROLLING_YEAR' }} size="sm" mt="sm">
        Full rankings →
      </Link>
    </Card>
  )
}
