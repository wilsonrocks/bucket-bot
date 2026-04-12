import { FactionsBarRace } from '@/components/animated-factions'
import { useGetFactionRankings } from '@/api/hooks'
import { Select, Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs } from '@/components/routed-tabs'
import { useState } from 'react'

function RankChange({ change }: { change: number | null | undefined }) {
  if (change == null)
    return (
      <Text span size="sm" c="green">
        NEW
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

export const Route = createFileRoute('/site/_site-pages/faction-rankings')({
  component: RouteComponent,
  staticData: {
    title: 'Faction Rankings',
  },
})

function RouteComponent() {
  const [metric, setMetric] = useState<
    'declarations' | 'points_per_declaration' | 'total_points'
  >('points_per_declaration')
  const factionRankingsQuery = useGetFactionRankings()

  if (factionRankingsQuery.isLoading) {
    return <div>Loading...</div>
  } else if (factionRankingsQuery.isError || !factionRankingsQuery.data) {
    return <div>Error loading faction rankings.</div>
  }

  return (
    <div>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          <Table tabularNums>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                  Rank
                </Table.Th>
                <Table.Th w={1} style={{ whiteSpace: 'nowrap' }}>
                  Change
                </Table.Th>
                <Table.Th>Faction</Table.Th>
                <Table.Th>Declarations</Table.Th>
                <Table.Th>Play rate</Table.Th>
                <Table.Th>Total Points</Table.Th>
                <Table.Th>Average Points</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {factionRankingsQuery.data.map((faction) => (
                <Table.Tr key={faction.faction_code}>
                  <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                    <div
                      style={{
                        borderLeft: `3px solid ${faction.hex_code}`,
                        paddingLeft: '0.5rem',
                      }}
                    >
                      {(faction.rank ?? 0).toString()}
                    </div>
                  </Table.Td>
                  <Table.Td w={1} style={{ whiteSpace: 'nowrap' }}>
                    <RankChange change={faction.rank_change} />
                  </Table.Td>
                  <Table.Td>{faction.faction_name}</Table.Td>
                  <Table.Td>{faction.declarations}</Table.Td>
                  <Table.Td>{`${((faction.declaration_rate ?? 0) * 100).toFixed(2)}%`}</Table.Td>
                  <Table.Td>{faction.total_points}</Table.Td>
                  <Table.Td>
                    <strong>
                      {(faction.points_per_declaration ?? 0).toFixed(2)}
                    </strong>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="animation">
          <Text size="sm" c="dimmed" mt="xs">
            Showing top 16 factions
          </Text>
          <Select
            mt="sm"
            w={220}
            value={metric}
            onChange={(v) =>
              setMetric((v ?? 'points_per_declaration') as typeof metric)
            }
            data={[
              { value: 'points_per_declaration', label: 'Average Points' },
              { value: 'declarations', label: 'Declarations' },
              { value: 'total_points', label: 'Total Points' },
            ]}
          />
          <FactionsBarRace metric={metric} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
