import { FactionsBarRace } from '@/components/animated-factions'
import { useGetFactionRankings } from '@/api/hooks'
import { Select, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs } from '@/components/routed-tabs'
import { useState } from 'react'

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
                'Faction',
                'Declarations',
                'Play rate',
                'Total Points',
                'Average Points',
              ],
              body: factionRankingsQuery.data.map((faction) => [
                <div
                  style={{
                    borderLeft: `3px solid ${faction.hex_code}`,
                    paddingLeft: '0.5rem',
                  }}
                >
                  {(faction.rank ?? 0).toString()}
                </div>,
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
