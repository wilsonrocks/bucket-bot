import { fetchFactionRankings, fetchFactionsOverTime } from '#/queries'
import { FactionsBarRace } from '#/components/animated-factions'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs } from '#/components/routed-tabs'
import { useState } from 'react'

function RankChange({ change }: { change: number | null | undefined }) {
  if (change == null) return <span className="text-sm text-green-600">NEW</span>
  if (change === 0) return <span className="text-sm text-gray-500">-</span>
  if (change > 0) return <span className="text-sm text-green-600">↑{change}</span>
  return <span className="text-sm text-red-600">↓{Math.abs(change)}</span>
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
  component: RouteComponent,
})

function RouteComponent() {
  const { factionRankings, factionsOverTime } = Route.useLoaderData()
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
              <tr className="border-b border-gray-200 text-left">
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Rank</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Change</th>
                <th className="px-2 py-2 font-semibold">Faction</th>
                <th className="px-2 py-2 font-semibold">Declarations</th>
                <th className="px-2 py-2 font-semibold">Play rate</th>
                <th className="px-2 py-2 font-semibold">Total Points</th>
                <th className="px-2 py-2 font-semibold">Average Points</th>
              </tr>
            </thead>
            <tbody>
              {(factionRankings as any[]).map((faction: any) => (
                <tr key={faction.faction_code} className="border-b border-gray-100">
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
          <p className="mt-1 text-sm text-gray-500">Showing top 16 factions</p>
          <select
            className="mt-2 w-[220px] rounded border border-gray-300 px-2 py-1 text-sm"
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
