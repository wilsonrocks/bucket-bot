import { fetchRankingTypes, fetchTeamRankings, fetchTeamsOverTime } from '@/queries'
import { Group, ScrollArea, Select, Table, Text, Tooltip } from '@mantine/core'
import { TeamAvatar } from '@/components/team-avatar'
import { useMediaQuery } from '@mantine/hooks'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Link } from '@/components/link'
import { Tabs } from '@/components/routed-tabs'
import { TeamsBarRace } from '@/components/animated-teams'
import z from 'zod'

function RankChange({ change, isNew }: { change: number | null | undefined; isNew?: boolean }) {
  if (isNew) return <Text span size="sm" c="green">NEW</Text>
  if (change == null) return <Text span size="sm" c="blue">RE</Text>
  if (change === 0) return <Text span size="sm" c="dimmed">-</Text>
  if (change > 0) return <Text span size="sm" c="green">↑{change}</Text>
  return <Text span size="sm" c="red">↓{Math.abs(change)}</Text>
}

export const Route = createFileRoute('/team-rankings')({
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Team Rankings' },
  beforeLoad: (context) => {
    if (!context.search.typeCode)
      throw redirect({ to: '/team-rankings', search: { typeCode: 'ROLLING_YEAR' } })
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search)
    const typeCode = params.get('typeCode') ?? 'ROLLING_YEAR'
    const [rankingTypes, rankings, teamsOverTime] = await Promise.all([
      fetchRankingTypes(),
      fetchTeamRankings({ data: { typeCode } }),
      fetchTeamsOverTime({ data: { typeCode } }),
    ])
    return { rankingTypes, rankings, teamsOverTime, typeCode }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { rankingTypes, rankings, teamsOverTime, typeCode } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const isMd = useMediaQuery('(min-width: 992px)')
  const rankingDescription = rankingTypes.find((rt) => rt.code === typeCode)?.description

  return (
    <div>
      <Group align="center" mb="sm">
        <Select
          searchable w={200} placeholder="Choose a ranking"
          data={rankingTypes.map((rt) => ({ value: rt.code, label: rt.name }))}
          value={typeCode}
          onChange={(value) => navigate({ search: (prev) => ({ ...prev, typeCode: value ?? undefined }) })}
        />
        {rankingDescription && <Text>{rankingDescription}</Text>}
      </Group>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          <Text size="sm" c="dimmed" mb="sm">
            Team ranking points are calculated as the sum of the ranking points of the top five players in the team.
          </Text>
          <div style={!isMd ? { maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' } : {}}>
            <ScrollArea type="auto">
              <Table tabularNums stickyHeader stickyHeaderOffset={0}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>Rank</Table.Th>
                    <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>Change</Table.Th>
                    <Table.Th w={1}>Logo</Table.Th>
                    <Table.Th>Team</Table.Th>
                    <Table.Th>Total Points</Table.Th>
                    <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>Players</Table.Th>
                    <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>Events</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(rankings as any[]).map((team: any) => (
                    <Table.Tr key={team.team_id}>
                      <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>{team.rank}</Table.Td>
                      <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}><RankChange change={team.rank_change} isNew={team.new_team} /></Table.Td>
                      <Table.Td w={1}>
                        <Tooltip label={team.team_name} withArrow>
                          <TeamAvatar image_key={team.image_key} name={team.team_name} />
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Link to="/team/$id" params={{ id: String(team.team_id) }} search={{ tab: undefined }}>{team.team_name}</Link>
                      </Table.Td>
                      <Table.Td>{team.total_points.toFixed(2)}</Table.Td>
                      <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>{team.player_count != null ? `${team.player_count}/5` : '—'}</Table.Td>
                      <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>{team.event_count != null ? `${team.event_count}/25` : '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <TeamsBarRace data={teamsOverTime as any} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
