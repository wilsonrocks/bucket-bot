import { useGetRankingTypes, useGetRankingsTypeCode } from '@/api/hooks'
import { Box, Group, Select, Table, Text } from '@mantine/core'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import z from 'zod'
import { Link } from '@/components/link'
import { Tabs } from '@/components/routed-tabs'
import { PlayersBarRace } from '@/components/animated-players'

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
  const rankings = useGetRankingsTypeCode(typeCode ?? '', { query: { enabled: !!typeCode } })
  return (
    <div>
      <Group align="center" mb="sm">
        <Select
          searchable
          w={200}
          placeholder="Choose a ranking"
          data={rankingTypes.data?.map((rt) => ({
            value: rt.code,
            label: rt.name,
          }))}
          value={typeCode}
          onChange={(value) => navigate({ search: (prev) => ({ ...prev, typeCode: value }) })}
        />
        {rankingDescription && <Text>{rankingDescription}</Text>}
      </Group>
      <Tabs defaultValue="table">
        <Tabs.List>
          <Tabs.Tab value="table">Table View</Tabs.Tab>
          <Tabs.Tab value="animation">Animation</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="table">
          {rankings.data ? (
            <Table
              tabularNums
              data={{
                head: ['Rank', 'Player', 'Total Points'],
                body: rankings.data.map((player) => [
                  <Box w={20}>{player.rank}</Box>,
                  <Box w={150}>
                    <Link to={PlayerRoute.to} params={{ id: player.player_id! }}>
                      {player.name}
                    </Link>
                  </Box>,
                  <Box w={50}>{(player.total_points ?? 0).toFixed(2)}</Box>,
                ]),
              }}
            />
          ) : (
            'Loading...'
          )}
        </Tabs.Panel>
        <Tabs.Panel value="animation">
          <PlayersBarRace typeCode={typeCode ?? ''} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
