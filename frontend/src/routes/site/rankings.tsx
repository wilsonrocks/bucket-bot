import { createFileRoute } from '@tanstack/react-router'
import { Table } from '@mantine/core'
import { useGetRankings } from '@/hooks/useApi'

export const Route = createFileRoute('/site/rankings')({
  component: RouteComponent,
})

function RouteComponent() {
  const rankings = useGetRankings()
  return (
    <div>
      {rankings.data ? (
        <Table
          tabularNums
          data={{
            head: ['Rank', 'Player', 'Total Points'],
            body: rankings.data.map((player) => [
              player.rank,
              player.name,
              player.total_points.toFixed(2),
            ]),
          }}
        />
      ) : (
        'Loading...'
      )}
    </div>
  )
}
