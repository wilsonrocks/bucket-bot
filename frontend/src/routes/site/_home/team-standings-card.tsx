import { Avatar, Card, Group, Skeleton, Stack, Table, Title, Tooltip } from '@mantine/core'
import { Link } from '@/components/link'
import { useGetTeamRankingsTypeCode, useGetTeams } from '@/api/hooks'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'
import { Route as TeamRankingsRoute } from '@/routes/site/_site-pages/team-rankings'

export function TeamStandingsCard() {
  const { data: rankings, isLoading: rankingsLoading } = useGetTeamRankingsTypeCode('ROLLING_YEAR')
  const { data: teams, isLoading: teamsLoading } = useGetTeams()

  const isLoading = rankingsLoading || teamsLoading
  const top5 = rankings?.slice(0, 5) ?? []
  const logoMap = new Map(teams?.map((t) => [t.id, t.image_key]) ?? [])

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Team Standings</Title>
      <div style={{ flex: 1 }}>
        {isLoading ? (
          <Stack gap={8}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={28} />
            ))}
          </Stack>
        ) : (
          <Table>
            <Table.Tbody>
              {top5.map((team) => {
                const imageKey = logoMap.get(team.team_id)
                return (
                  <Table.Tr key={team.team_id}>
                    <Table.Td w={30} c="dimmed">#{team.rank}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Tooltip label={team.team_name} withArrow>
                          <Link to={TeamRoute.to} params={{ id: String(team.team_id) }} search={{ tab: undefined }}>
                            <Avatar
                              src={imageKey ? `${import.meta.env.VITE_ASSETS_URL}/${imageKey}-w150.png` : null}
                              alt={team.team_name}
                              size={22}
                              radius="sm"
                            >
                              {team.team_name[0]}
                            </Avatar>
                          </Link>
                        </Tooltip>
                        <Link to={TeamRoute.to} params={{ id: String(team.team_id) }} search={{ tab: undefined }}>
                          {team.team_name}
                        </Link>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right" c="dimmed">{team.total_points.toFixed(0)} pts</Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </div>
      <Link to={TeamRankingsRoute.to} search={{ typeCode: 'ROLLING_YEAR', tab: undefined }} size="sm" mt="sm">
        Full team standings →
      </Link>
    </Card>
  )
}
