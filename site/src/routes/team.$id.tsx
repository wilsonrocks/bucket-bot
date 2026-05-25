import { fetchTeam } from '#/queries'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Link } from '#/components/link'
import z from 'zod'

export const Route = createFileRoute('/team/$id')({
  params: z.object({ id: z.string() }),
  staticData: { title: 'Team' },
  loader: async ({ params }) => {
    const team = await fetchTeam({ data: { id: Number(params.id) } })
    if (!team) throw notFound()
    return team
  },
  head: ({ loaderData }) => loaderData ? ({
    meta: [
      { title: `${loaderData.name} — b(UK)et bot` },
      { property: 'og:title', content: loaderData.name },
      { property: 'og:description', content: `Team page for ${loaderData.name}` },
    ],
  }) : {},
  component: RouteComponent,
})

function RouteComponent() {
  const team = Route.useLoaderData()
  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">{team.name}</h2>
      {team.description && <p>{team.description}</p>}
      {team.image_key && (
        <img
          src={`${import.meta.env.VITE_ASSETS_URL}/${team.image_key}-w800.png`}
          alt={`${team.name} logo`}
          className="mb-4 max-w-[400px] rounded-sm object-contain"
        />
      )}
      <table className="mt-4 min-w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="px-2 py-2 font-semibold">Player</th>
            <th className="px-2 py-2 font-semibold">Rolling Year Points</th>
            <th className="px-2 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {(team.members as any[]).map((member: any) => (
            <tr key={member.membership_id} className="border-b border-gray-100">
              <td className="px-2 py-1.5">
                <Link
                  to="/player/$id"
                  params={{ id: member.player_id }}
                  search={{ tab: undefined, typeCode: undefined, painting: undefined }}
                >
                  {member.player_name}
                </Link>
              </td>
              <td className="px-2 py-1.5">
                {member.rolling_year_points != null ? member.rolling_year_points.toFixed(2) : '-'}
              </td>
              <td className="px-2 py-1.5">
                {member.is_captain && (
                  <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    Captain
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
