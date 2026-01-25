import { useGetFactionRankings } from '@/hooks/useApi'
import { Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/site/faction-rankings')({
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
            'Average Points',
            'Times Declared',
            'Total Points',
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
            <strong>{faction.points_per_declaration.toFixed(2)}</strong>,
            faction.declarations,
            faction.total_points,
          ]),
        }}
      />
    </div>
  )
}
