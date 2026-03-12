import { useGetFactionRankings } from '@/hooks/useApi'
import { Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/site/_site-pages/faction-rankings')({
  component: RouteComponent,
  staticData: {
    title: 'Faction Rankings',
  },
})

function RouteComponent() {
  const factionRankingsQuery = useGetFactionRankings()
  if (factionRankingsQuery.isLoading) {
    return <div>Loading...</div>
  } else if (factionRankingsQuery.isError || !factionRankingsQuery.data) {
    return <div>Error loading faction rankings.</div>
  }

  return (
    <div>
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
              {faction.rank.toString()}
            </div>,
            faction.faction_name,
            faction.declarations,
            `${(faction.declaration_rate * 100).toFixed(2)}%`,
            faction.total_points,
            <strong>{faction.points_per_declaration.toFixed(2)}</strong>,
          ]),
        }}
      />
    </div>
  )
}
