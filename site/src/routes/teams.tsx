import { fetchTeams } from '#/queries'
import { Link } from '#/components/link'
import { createFileRoute } from '@tanstack/react-router'
import { SITE_NAME, seo } from '#/helpers/seo'
import { SortableTh, useTableSort } from '#/components/sortable-table'

export const Route = createFileRoute('/teams')({
  staticData: { title: 'Teams' },
  loader: () => fetchTeams(),
  head: () =>
    seo({
      title: `Teams — ${SITE_NAME}`,
      description: 'Directory of UK Malifaux clubs and teams.',
      path: '/teams',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const teams = Route.useLoaderData()
  const { rows, getSortProps } = useTableSort(teams, {
    team: { value: (t) => t.name },
    location: { value: (t) => t.description },
  })
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          <SortableTh {...getSortProps('team')}>Team</SortableTh>
          <SortableTh {...getSortProps('location')}>Location</SortableTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((team) => (
          <tr key={team.id} className="border-b border-border">
            <td className="px-2 py-1.5">
              <Link to="/team/$id" params={{ id: String(team.id) }} search={{ tab: undefined }}>
                {team.name}
              </Link>
            </td>
            <td className="px-2 py-1.5">{team.description ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
