import { createFileRoute } from '@tanstack/react-router'
import { fetchPlayers } from '#/queries'
import { Link } from '#/components/link'

export const Route = createFileRoute('/players')({
  staticData: { title: 'Players' },
  loader: () => fetchPlayers(),
  component: RouteComponent,
})

function RouteComponent() {
  const players = Route.useLoaderData()
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left">
          <th className="px-2 py-2 font-semibold">Name</th>
          <th className="px-2 py-2 font-semibold">Current Team</th>
          <th className="px-2 py-2 font-semibold">Events</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr key={p.id ?? p.name} className="border-b border-gray-100">
            <td className="px-2 py-1.5">
              {p.id != null ? (
                <Link
                  to="/player/$id"
                  params={{ id: p.id }}
                  search={{ tab: undefined, typeCode: undefined, painting: undefined }}
                >
                  {p.name}
                </Link>
              ) : (
                p.name
              )}
            </td>
            <td className="px-2 py-1.5">
              {p.current_team_id != null ? (
                <Link
                  to="/team/$id"
                  params={{ id: String(p.current_team_id) }}
                  search={{ tab: undefined }}
                >
                  {p.current_team_name}
                </Link>
              ) : (
                p.current_team_name ?? '—'
              )}
            </td>
            <td className="px-2 py-1.5">{p.event_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
