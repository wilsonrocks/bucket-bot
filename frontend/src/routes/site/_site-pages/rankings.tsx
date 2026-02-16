import { useGetRankingTypes, useGetRankings } from '@/hooks/useApi'
import { Box, Group, Select, Table, Text } from '@mantine/core'
import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/site/_site-pages/rankings')({
  component: RouteComponent,
  validateSearch: z.object({ typeCode: z.string().optional().catch('') }),
  staticData: { title: 'Rankings' },
  beforeLoad: (context) => {
    const { typeCode } = context.search
    if (!typeCode)
      throw redirect({
        to: '/site/rankings',
        search: { typeCode: 'ROLLING_YEAR' },
      })
  },
})

function RouteComponent() {
  const navigate = Route.useNavigate()

  const { typeCode } = Route.useSearch()
  const rankingTypes = useGetRankingTypes()
  const rankingDescription = rankingTypes.data?.find(
    (rt) => rt.code === typeCode,
  )?.description
  const rankings = useGetRankings(typeCode)
  return (
    <div>
      <Group align="center">
        <Select
          searchable
          w={200}
          placeholder="Choose a ranking"
          data={rankingTypes.data?.map((rt) => ({
            value: rt.code,
            label: rt.name,
          }))}
          value={typeCode}
          onChange={(value) => navigate({ search: { typeCode: value } })}
        />
        {rankingDescription && <Text>{rankingDescription}</Text>}
      </Group>
      {rankings.data ? (
        <>
          <Table
            tabularNums
            data={{
              head: ['Rank', 'Player', 'Total Points'],
              body: rankings.data.map((player) => [
                <Box w={20}>{player.rank}</Box>,
                <Box w={150}>{player.name}</Box>,
                <Box w={50}>{player.total_points.toFixed(2)}</Box>,
              ]),
            }}
          />
        </>
      ) : (
        'Loading...'
      )}
    </div>
  )
}
