import { createFileRoute } from '@tanstack/react-router'
import { fetchPlayers } from '#/queries'
import { Link } from '#/components/link'
import { SITE_NAME, seo } from '#/helpers/seo'
import { SortableTh, useTableSort } from '#/components/sortable-table'

export const Route = createFileRoute('/players')({
  staticData: { title: 'Players' },
  loader: () => fetchPlayers(),
  head: () =>
    seo({
      title: `Players — ${SITE_NAME}`,
      description: 'Directory of UK Malifaux players with their teams and event counts.',
      path: '/players',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const players = Route.useLoaderData()
  const { rows, getSortProps } = useTableSort(players, {
    name: { value: (p) => p.name },
    team: { value: (p) => p.current_team_name },
    events: { value: (p) => p.event_count, natural: 'desc' },
  })
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          <SortableTh {...getSortProps('name')}>Name</SortableTh>
          <SortableTh {...getSortProps('team')}>Current Team</SortableTh>
          <SortableTh {...getSortProps('events')}>Events</SortableTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id ?? p.name} className="border-b border-border">
            <td className="px-2 py-1.5">
              {p.id != null ? (
                <Link
                  to="/player/$id"
                  params={{ id: p.id }}
                  search={{ tab: undefined, typeCode: undefined, painting: undefined, achievement: undefined }}
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
