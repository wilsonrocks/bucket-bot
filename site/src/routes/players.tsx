import { createFileRoute } from '@tanstack/react-router'
import { Table } from '@mantine/core'
import { fetchPlayers } from '@/queries'
import { Link } from '@/components/link'

export const Route = createFileRoute('/players')({
  staticData: { title: 'Players' },
  loader: () => fetchPlayers(),
  component: RouteComponent,
})

function RouteComponent() {
  const players = Route.useLoaderData()
  return (
    <Table data={{
      head: ['Name', 'Current Team', 'Events'],
      body: players.map((p) => [
        p.id != null
          ? <Link to="/player/$id" params={{ id: p.id }} search={{ tab: undefined, typeCode: undefined, painting: undefined }}>{p.name}</Link>
          : p.name,
        p.current_team_id != null
          ? <Link to="/team/$id" params={{ id: String(p.current_team_id) }} search={{ tab: undefined }}>{p.current_team_name}</Link>
          : (p.current_team_name ?? '—'),
        p.event_count,
      ]),
    }} />
  )
}
