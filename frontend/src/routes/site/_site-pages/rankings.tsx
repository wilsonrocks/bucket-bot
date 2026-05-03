import { useGetRankingTypes, useGetRankingsTypeCode } from '@/api/hooks'
import { playerShortName } from '@/helpers/player-short-name'
import { Group, Select, Table, Text, Tooltip } from '@mantine/core'
import { TeamAvatar } from '@/components/team-avatar'
import { useMediaQuery } from '@mantine/hooks'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'
import z from 'zod'
import { Link } from '@/components/link'
import { Tabs } from '@/components/routed-tabs'
import { PlayersBarRace } from '@/components/animated-players'

function RankChange({
  change,
  newPlayer,
}: {
  change: number | null | undefined
  newPlayer?: boolean
}) {
  if (newPlayer)
    return (
      <Text span size="sm" c="green">
        NEW
      </Text>
    )
  if (change == null)
    return (
      <Text span size="sm" c="blue">
        RE
      </Text>
    )
  if (change === 0)
    return (
      <Text span size="sm" c="dimmed">
        -
      </Text>
    )
  if (change > 0)
    return (
      <Text span size="sm" c="green">
        ↑{change}
      </Text>
    )
  return (
    <Text span size="sm" c="red">
      ↓{Math.abs(change)}
    </Text>
  )
}

export const Route = createFileRoute('/site/_site-pages/rankings')({
  component: RouteComponent,
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Rankings' },
  beforeLoad: (context) => {
    const { typeCode } = context.search
    if (!typeCode)
      throw redirect({
        to: '/site/rankings',
        search: { typeCode: 'ROLLING_YEAR', tab: undefined },
      })
  },
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const isMobile = useMediaQuery('(max-width: 600px)')
  const isMd = useMediaQuery('(min-width: 992px)')
  const isLg = useMediaQuery('(min-width: 1200px)')
  const headerOffset = isLg ? 80 : isMd ? 70 : 60

  const { typeCode } = Route.useSearch()
  const rankingTypes = useGetRankingTypes()
  const rankingDescription = rankingTypes.data?.find(
    (rt) => rt.code === typeCode,
  )?.description
  const rankings = useGetRankingsTypeCode(typeCode ?? '', {
    query: { enabled: !!typeCode },
  })
  return (
    <div>
      <Group align="center" mb="sm">
        <Select
          searchable
          w={200}
          placeholder="Choose a ranking"
          data={rankingTypes.data?.map((rt) => ({
            value: rt.code,
            label: rt.name,
          }))}
          value={typeCode}
          onChange={(value) =>
            navigate({ search: (prev) => ({ ...prev, typeCode: value }) })
          }
        />
        {rankingDescription && <Text>{rankingDescription}</Text>}
      </Group>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          {rankings.data ? (
            <Table tabularNums stickyHeader stickyHeaderOffset={headerOffset}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                    Rank
                  </Table.Th>
                  <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                    Change
                  </Table.Th>
                  <Table.Th>Player</Table.Th>
                  <Table.Th>Total Points</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rankings.data.map((player) => (
                  <Table.Tr key={player.id}>
                    <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                      {player.rank}
                    </Table.Td>
                    <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                      <RankChange
                        change={player.rank_change}
                        newPlayer={player.new_player}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Link
                          to={PlayerRoute.to}
                          params={{ id: player.player_id! }}
                          search={{ tab: undefined }}
                        >
                          {isMobile ? playerShortName(player) : player.name}
                        </Link>
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
                                size={22}
                              />
                            </Link>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{(player.total_points ?? 0).toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            'Loading...'
          )}
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <Text size="sm" c="dimmed" mt="xs">
            Showing top 16 players
          </Text>
          <PlayersBarRace typeCode={typeCode ?? ''} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
