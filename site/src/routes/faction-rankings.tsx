import { fetchFactionRankings, fetchFactionsOverTime } from '#/queries'
import { FactionsBarRace } from '#/components/animated-factions'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs } from '#/components/routed-tabs'
import { useState } from 'react'
import { SITE_NAME, seo } from '#/helpers/seo'
import { SortableTh, useTableSort } from '#/components/sortable-table'

function RankChange({ change }: { change: number | null | undefined }) {
  if (change == null) return <span className="text-sm text-green-600 dark:text-green-400">NEW</span>
  if (change === 0) return <span className="text-sm text-muted-foreground">-</span>
  if (change > 0) return <span className="text-sm text-green-600 dark:text-green-400">↑{change}</span>
  return <span className="text-sm text-red-600 dark:text-red-400">↓{Math.abs(change)}</span>
}

export const Route = createFileRoute('/faction-rankings')({
  staticData: { title: 'Faction Rankings' },
  loader: async () => {
    const [factionRankings, factionsOverTime] = await Promise.all([
      fetchFactionRankings(),
      fetchFactionsOverTime(),
    ])
    return { factionRankings, factionsOverTime }
  },
  head: () =>
    seo({
      title: `Faction Rankings — ${SITE_NAME}`,
      description: 'Malifaux faction rankings — see which factions are dominating UK tournaments.',
      path: '/faction-rankings',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { factionRankings, factionsOverTime } = Route.useLoaderData()
  const { rows, getSortProps } = useTableSort(factionRankings as any[], {
    rank: { value: (f) => f.rank },
    change: { value: (f) => f.rank_change, natural: 'desc' },
    faction: { value: (f) => f.faction_name },
    declarations: { value: (f) => f.declarations, natural: 'desc' },
    rate: { value: (f) => f.declaration_rate, natural: 'desc' },
    points: { value: (f) => f.total_points, natural: 'desc' },
    average: { value: (f) => f.points_per_declaration, natural: 'desc' },
  })
  const [metric, setMetric] = useState<'declarations' | 'points_per_declaration' | 'total_points'>('points_per_declaration')

  return (
    <div>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left">
                <SortableTh {...getSortProps('rank')}>Rank</SortableTh>
                <SortableTh {...getSortProps('change')}>Change</SortableTh>
                <SortableTh {...getSortProps('faction')}>Faction</SortableTh>
                <SortableTh {...getSortProps('declarations')}>Declarations</SortableTh>
                <SortableTh {...getSortProps('rate')}>Play rate</SortableTh>
                <SortableTh {...getSortProps('points')}>Total Points</SortableTh>
                <SortableTh {...getSortProps('average')}>Average Points</SortableTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((faction: any) => (
                <tr key={faction.faction_code} className="border-b border-border">
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <div style={{ borderLeft: `3px solid ${faction.hex_code}`, paddingLeft: '0.5rem' }}>
                      {(faction.rank ?? 0).toString()}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <RankChange change={faction.rank_change} />
                  </td>
                  <td className="px-2 py-1.5">{faction.faction_name}</td>
                  <td className="px-2 py-1.5">{faction.declarations}</td>
                  <td className="px-2 py-1.5">
                    {`${((faction.declaration_rate ?? 0) * 100).toFixed(2)}%`}
                  </td>
                  <td className="px-2 py-1.5">{faction.total_points}</td>
                  <td className="px-2 py-1.5">
                    <strong>{(faction.points_per_declaration ?? 0).toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <p className="mt-1 text-sm text-muted-foreground">Showing top 16 factions</p>
          <select
            className="mt-2 w-[220px] rounded border border-border px-2 py-1 text-sm"
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
          >
            <option value="points_per_declaration">Average Points</option>
            <option value="declarations">Declarations</option>
            <option value="total_points">Total Points</option>
          </select>
          <FactionsBarRace data={factionsOverTime as any} metric={metric} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
