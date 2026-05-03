import {
  Card,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { TeamAvatar } from '@/components/team-avatar'
import { Link } from '@/components/link'
import { useGetRankingsTypeCode } from '@/api/hooks'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'
import { Route as RankingsRoute } from '@/routes/site/_site-pages/rankings'

export function TopPlayersCard() {
  const { data, isLoading } = useGetRankingsTypeCode('ROLLING_YEAR')
  const top5 = data?.slice(0, 5) ?? []

  return (
    <Card
      withBorder
      padding="md"
      h="100%"
      mih={280}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Title order={3} mb="sm">
        Top Players
      </Title>
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
              {top5.map((player) => (
                <Table.Tr key={player.player_id}>
                  <Table.Td w={30} c="dimmed">
                    #{player.rank}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {player.current_team_id != null && (
                        <Tooltip label={player.current_team_name} withArrow>
                          <Link
                            to={TeamRoute.to}
                            params={{ id: String(player.current_team_id) }}
                            search={{ tab: undefined }}
                          >
                            <TeamAvatar
                              image_key={player.team_image_key}
                              name={player.current_team_name ?? '?'}
                            />
                          </Link>
                        </Tooltip>
                      )}
                      {player.player_id != null ? (
                        <Link
                          to={PlayerRoute.to}
                          params={{ id: player.player_id }}
                          search={{ tab: undefined }}
                        >
                          {player.name}
                        </Link>
                      ) : (
                        <Text>{player.name}</Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed">
                    {player.total_points?.toFixed(0)} pts
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>
      <Link to={RankingsRoute.to} search={{ tab: undefined }} size="sm" mt="sm">
        Full rankings →
      </Link>
    </Card>
  )
}
