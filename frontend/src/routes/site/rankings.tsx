import { useGetRankings, useGetRankingTypes } from '@/hooks/useApi'
import { Select, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/site/rankings')({
  component: RouteComponent,
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
})

function RouteComponent() {
  const rankingTypes = useGetRankingTypes()
  const navigate = Route.useNavigate()

  const { typeCode } = Route.useSearch()
  const rankings = useGetRankings(typeCode)
  return (
    <div>
      <Select
        placeholder="Select a ranking type"
        data={rankingTypes.data?.map((rt) => ({
          value: rt.code,
          label: `${rt.code} - ${rt.description}`,
        }))}
        value={typeCode}
        onChange={(value) => navigate({ search: { typeCode: value } })}
      />
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
