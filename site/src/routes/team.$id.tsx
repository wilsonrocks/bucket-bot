import { fetchTeam } from '#/queries'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Link } from '#/components/link'
import { Image } from '#/components/image'
import z from 'zod'
import { SITE_NAME, SITE_URL, absoluteUrl, jsonLd, seo } from '#/helpers/seo'
import type { SportsTeam, WithContext } from 'schema-dts'

function teamLogoUrl(imageKey: string | null | undefined): string | undefined {
  if (!imageKey) return undefined
  return `${import.meta.env.VITE_ASSETS_URL}/${imageKey}-w800.webp`
}

export const Route = createFileRoute('/team/$id')({
  params: z.object({ id: z.string() }),
  staticData: { title: 'Team' },
  loader: async ({ params }) => {
    const team = await fetchTeam({ data: { id: Number(params.id) } })
    if (!team) throw notFound()
    return team
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const team = loaderData
    const members = (team.members as any[]) ?? []
    const logo = teamLogoUrl(team.image_key as string | null | undefined)
    const ogImage = team.image_key
      ? `${import.meta.env.VITE_ASSETS_URL}/${team.image_key}-ogp.jpg`
      : undefined
    const topMember = members[0]
    const captain = members.find((m) => m.is_captain)
    const description = [
      `${members.length} player${members.length === 1 ? '' : 's'}.`,
      captain ? `Captain: ${captain.player_name}.` : undefined,
      topMember?.rolling_year_rank
        ? `Top ranked member: ${topMember.player_name} (#${topMember.rolling_year_rank} rolling-year).`
        : undefined,
    ]
      .filter(Boolean)
      .join(' ')

    const schema: WithContext<SportsTeam> = {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: team.name,
      url: absoluteUrl(`/team/${params.id}`),
      sport: 'Malifaux',
      ...(logo ? { logo } : {}),
      member: members.map((m) => ({
        '@type': 'Person',
        name: m.player_name,
        url: `${SITE_URL}/player/${m.player_id}`,
      })),
    }

    return {
      ...seo({
        title: `${team.name} — ${SITE_NAME}`,
        description,
        path: `/team/${params.id}`,
        image: ogImage,
        type: 'profile',
      }),
      scripts: [jsonLd(schema)],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const team = Route.useLoaderData()
  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">{team.name}</h2>
      {team.description && <p>{team.description}</p>}
      {team.image_key && (
        <Image
          imageKey={team.image_key}
          width={team.imageWidth}
          height={team.imageHeight}
          alt={`${team.name} logo`}
          sizes="(max-width: 400px) 100vw, 400px"
          className="mb-4 h-auto max-w-[400px] rounded-sm object-contain"
        />
      )}
      <table className="mt-4 min-w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-2 py-2 font-semibold">Player</th>
            <th className="px-2 py-2 font-semibold">Rolling Year Points</th>
            <th className="px-2 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {(team.members as any[]).map((member: any) => (
            <tr key={member.membership_id} className="border-b border-border">
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
                  <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
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
