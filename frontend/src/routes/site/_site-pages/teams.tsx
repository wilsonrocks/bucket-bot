import { useGetTeams } from '@/api/hooks'
import { Anchor, Table } from '@mantine/core'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Route as TeamRoute } from './team.$id'

export const Route = createFileRoute('/site/_site-pages/teams')({
  component: RouteComponent,
  staticData: { title: 'Teams' },
})

function RouteComponent() {
  const { data: teams } = useGetTeams()

  if (!teams) return <div>Loading...</div>

  return (
    <div>
      <Table
        data={{
          head: ['Team', 'Location'],
          body: teams.map((team) => [
            <Anchor
              component={Link}
              to={TeamRoute.to}
              params={{ id: String(team.id) }}
            >
              {team.name}
            </Anchor>,
            team.description ?? '',
          ]),
        }}
      />
    </div>
  )
}
