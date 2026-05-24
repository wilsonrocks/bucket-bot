import { Card, Group, Table, Title, Tooltip } from '@mantine/core'
import { TeamAvatar } from '@/components/team-avatar'
import { Link } from '@/components/link'

type TeamRanking = {
  team_id: number
  team_name: string
  image_key: string | null
  rank: number
  total_points: number
}

export function TeamStandingsCard({ data }: { data: TeamRanking[] }) {
  const top5 = data.slice(0, 5)

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Team Standings</Title>
      <div style={{ flex: 1 }}>
        <Table>
          <Table.Tbody>
            {top5.map((team) => (
              <Table.Tr key={team.team_id}>
                <Table.Td w={30} c="dimmed">#{team.rank}</Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Tooltip label={team.team_name} withArrow>
                      <Link to="/team/$id" params={{ id: String(team.team_id) }} search={{ tab: undefined }}>
                        <TeamAvatar image_key={team.image_key} name={team.team_name} />
                      </Link>
                    </Tooltip>
                    <Link to="/team/$id" params={{ id: String(team.team_id) }} search={{ tab: undefined }}>
                      {team.team_name}
                    </Link>
                  </Group>
                </Table.Td>
                <Table.Td ta="right" c="dimmed">{team.total_points.toFixed(0)} pts</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <Link to="/team-rankings" search={{ typeCode: 'ROLLING_YEAR' }} size="sm" mt="sm">
        Full team standings →
      </Link>
    </Card>
  )
}
