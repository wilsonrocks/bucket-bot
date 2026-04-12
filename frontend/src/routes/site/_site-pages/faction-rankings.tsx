import { FactionsBarRace } from '@/components/animated-factions'
import { useGetFactionRankings } from '@/api/hooks'
import type { GetFactionRankings200Item } from '@/api/generated/bucketBotAPI.schemas'
import { Select, Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs } from '@/components/routed-tabs'
import { useState } from 'react'

type FactionRankingEntry = GetFactionRankings200Item & { rank_change: number | null }

function RankChange({ change }: { change: number | null | undefined }) {
  if (change == null) return <Text span size="sm" c="green">NEW</Text>
  if (change === 0) return <Text span size="sm" c="dimmed">-</Text>
  if (change > 0) return <Text span size="sm" c="green">↑{change}</Text>
  return <Text span size="sm" c="red">↓{Math.abs(change)}</Text>
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
          <Table
            data={{
              head: [
                'Rank',
                'Change',
                'Faction',
                'Declarations',
                'Play rate',
                'Total Points',
                'Average Points',
              ],
              body: (factionRankingsQuery.data as FactionRankingEntry[]).map((faction) => [
                <div
                  style={{
                    borderLeft: `3px solid ${faction.hex_code}`,
                    paddingLeft: '0.5rem',
                  }}
                >
                  {(faction.rank ?? 0).toString()}
                </div>,
                <RankChange change={faction.rank_change} />,
                faction.faction_name,
                faction.declarations,
                `${((faction.declaration_rate ?? 0) * 100).toFixed(2)}%`,
                faction.total_points,
                <strong>{(faction.points_per_declaration ?? 0).toFixed(2)}</strong>,
              ]),
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="animation">
          <Text size="sm" c="dimmed" mt="xs">Showing top 16 factions</Text>
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
