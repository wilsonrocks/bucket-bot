import { fetchTeams } from '#/queries'
import { Link } from '#/components/link'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/teams')({
  staticData: { title: 'Teams' },
  loader: () => fetchTeams(),
  component: RouteComponent,
})

function RouteComponent() {
  const teams = Route.useLoaderData()
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left">
          <th className="px-2 py-2 font-semibold">Team</th>
          <th className="px-2 py-2 font-semibold">Location</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team) => (
          <tr key={team.id} className="border-b border-gray-100">
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
