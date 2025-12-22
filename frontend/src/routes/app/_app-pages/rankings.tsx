import { createFileRoute } from '@tanstack/react-router'
import { Table } from '@mantine/core'
import { useGetRankings } from '@/hooks/useApi'

export const Route = createFileRoute('/app/_app-pages/rankings')({
  component: RouteComponent,
})

function RouteComponent() {
  const rankings = useGetRankings()
  return (
    <div>
      {rankings.data ? (
        <Table
          data={{
            head: ['Rank', 'Player', 'Total Points'],
            body: rankings.data.map((player) => [
              player.rank,
              player.name,
              player.total_points,
            ]),
          }}
        />
      ) : (
        'Loading...'
      )}
    </div>
  )
}
