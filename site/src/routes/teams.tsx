import { fetchTeams } from '@/queries'
import { Link } from '@/components/link'
import { Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/teams')({
  staticData: { title: 'Teams' },
  loader: () => fetchTeams(),
  component: RouteComponent,
})

function RouteComponent() {
  const teams = Route.useLoaderData()
  return (
    <Table data={{
      head: ['Team', 'Location'],
      body: teams.map((team) => [
        <Link to="/team/$id" params={{ id: String(team.id) }} search={{ tab: undefined }}>{team.name}</Link>,
        team.description ?? '',
      ]),
    }} />
  )
}
