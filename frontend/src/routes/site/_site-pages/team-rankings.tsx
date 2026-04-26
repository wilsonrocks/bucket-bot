import { useGetRankingTypes, useGetTeamRankingsTypeCode } from '@/api/hooks'
import { FeatureFlag } from '@/components/FeatureFlag'
import { Group, ScrollArea, Select, Table, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'
import z from 'zod'
import { Link } from '@/components/link'
import { Tabs } from '@/components/routed-tabs'
import { TeamsBarRace } from '@/components/animated-teams'

function RankChange({
  change,
  isNew,
}: {
  change: number | null | undefined
  isNew?: boolean
}) {
  if (isNew)
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

export const Route = createFileRoute('/site/_site-pages/team-rankings')({
  component: RouteComponent,
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Team Rankings' },
  beforeLoad: (context) => {
    const { typeCode } = context.search
    if (!typeCode)
      throw redirect({
        to: '/site/team-rankings',
        search: { typeCode: 'ROLLING_YEAR' },
      })
  },
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const isMd = useMediaQuery('(min-width: 992px)')

const { typeCode } = Route.useSearch()
  const rankingTypes = useGetRankingTypes()
  const rankingDescription = rankingTypes.data?.find(
    (rt) => rt.code === typeCode,
  )?.description
  const rankings = useGetTeamRankingsTypeCode(typeCode ?? '', {
    query: { enabled: !!typeCode },
  })

  return (
    <FeatureFlag flag="TEAM_STATS">
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
            Team ranking points are calculated as the sum of the ranking points
            of the top five players in the team. Since individual points are
            from a player's top 5 performances, there's a cap of 25 events for a
            team.
            {rankings.data ? (
              <div
                style={{
                  position: 'relative',
                  ...(!isMd
                    ? {
                        maskImage:
                          'linear-gradient(to right, black 80%, transparent 100%)',
                        WebkitMaskImage:
                          'linear-gradient(to right, black 80%, transparent 100%)',
                      }
                    : {}),
                }}
              >
                <ScrollArea type="auto">
                  <Table
                    tabularNums
                    stickyHeader
                    stickyHeaderOffset={0}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                          Rank
                        </Table.Th>
                        <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                          Change
                        </Table.Th>
                        <Table.Th>Team</Table.Th>
                        <Table.Th>Total Points</Table.Th>
                        <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                          Players
                        </Table.Th>
                        <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                          Events
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rankings.data.map((team) => (
                        <Table.Tr key={team.team_id}>
                          <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                            {team.rank}
                          </Table.Td>
                          <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                            <RankChange
                              change={team.rank_change}
                              isNew={team.new_team}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Link
                              to={TeamRoute.to}
                              params={{ id: team.team_id }}
                            >
                              {team.team_name}
                            </Link>
                          </Table.Td>
                          <Table.Td>{team.total_points.toFixed(2)}</Table.Td>
                          <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                            {team.player_count != null
                              ? `${team.player_count}/5`
                              : '—'}
                          </Table.Td>
                          <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                            {team.event_count != null
                              ? `${team.event_count}/25`
                              : '—'}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              'Loading...'
            )}
          </Tabs.Panel>
          <Tabs.Panel value="animation">
            <TeamsBarRace typeCode={typeCode ?? 'ROLLING_YEAR'} />
          </Tabs.Panel>
        </Tabs>
      </div>
    </FeatureFlag>
  )
}
