import {
  fetchPlayer,
  fetchPlayerRankingHistory,
  fetchPlayerTeams,
  fetchPlayerTourneys,
  fetchPlayerPaintingWins,
  fetchPlayerAchievements,
  fetchRankingTypes,
} from '#/queries'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { optionalNumber, optionalString } from '#/helpers/search-params'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { PaintingLightbox, positionLabel } from '#/components/painting-lightbox'
import { Image } from '#/components/image'
import { formatDate, parseISO } from 'date-fns'
import { PlayerRankingOverTime } from '#/components/charts'
import { SITE_NAME, SITE_URL, absoluteUrl, jsonLd, seo } from '#/helpers/seo'
import type { Person, WithContext } from 'schema-dts'
import { achievementShareText, achievementShareUrl, achievementsTabLabel, earnedCount, groupAchievements } from '#/helpers/achievements'
import { AchievementModal, type EarnedAchievement } from '#/components/achievement-modal'
import { ShareButton } from '#/components/share-button'

export const Route = createFileRoute('/player/$id')({
  params: {
    parse: (raw: Record<string, string>) => ({ id: Number(raw.id) }),
    stringify: (params: { id: number }) => ({ id: String(params.id) }),
  },
  validateSearch: (search: Record<string, unknown>) => ({
    typeCode: optionalString(search.typeCode),
    tab: optionalString(search.tab),
    painting: optionalNumber(search.painting),
    achievement: optionalString(search.achievement),
  }),
  loader: async ({ params, location }) => {
    const searchParams = new URLSearchParams(location.search)
    const typeCode = searchParams.get('typeCode') ?? 'ROLLING_YEAR'
    const [player, rankingTypes, rankingsData, tourneys, teams, paintingWins, achievements] = await Promise.all([
      fetchPlayer({ data: { id: params.id } }),
      fetchRankingTypes(),
      fetchPlayerRankingHistory({ data: { playerId: params.id, typeCode } }),
      fetchPlayerTourneys({ data: { playerId: params.id } }),
      fetchPlayerTeams({ data: { playerId: params.id } }),
      fetchPlayerPaintingWins({ data: { playerId: params.id } }),
      fetchPlayerAchievements({ data: { playerId: params.id } }),
    ])
    if (!player) throw notFound()
    return { player, rankingTypes, rankingsData, tourneys, teams, paintingWins, achievements, typeCode }
  },
  head: ({ loaderData, params, match }) => {
    if (!loaderData) return {}
    const { player, teams, tourneys, rankingsData, achievements, typeCode } = loaderData

    const latestRollingYearRank =
      typeCode === 'ROLLING_YEAR'
        ? [...(rankingsData.rankings ?? [])]
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0]?.rank
        : undefined

    const currentTeam = teams.find((t: any) => !t.left_date)?.team_name
    const descParts = [
      latestRollingYearRank
        ? `Currently ranked #${latestRollingYearRank} in the UK rolling-year Malifaux rankings.`
        : `UK Malifaux player.`,
      currentTeam ? `Plays for ${currentTeam}.` : undefined,
      tourneys.length ? `${tourneys.length} tournament results tracked.` : undefined,
    ].filter(Boolean)

    const avatar = (player as any).discord_avatar_url as string | null | undefined

    const schema: WithContext<Person> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: player.name,
      url: absoluteUrl(`/player/${params.id}`),
      ...(avatar ? { image: avatar } : {}),
      ...(currentTeam
        ? {
            memberOf: teams
              .filter((t: any) => !t.left_date)
              .map((t: any) => ({
                '@type': 'SportsTeam' as const,
                name: t.team_name,
                url: `${SITE_URL}/team/${t.team_id}`,
              })),
          }
        : {}),
    }

    // A shared achievement link gets a preview of that achievement instead.
    const shared = achievements && findEarnedAchievement(achievements, match.search.achievement)
    const sharedSeo = shared
      ? {
          title: `${achievementShareText(player.name, shared.name)} — ${SITE_NAME}`,
          description: shared.description.trim() || shared.flavourText.trim() || descParts.join(' '),
          image: shared.imageKey ? `${import.meta.env.VITE_ASSETS_URL}/${shared.imageKey}-ogp.jpg` : avatar,
        }
      : undefined

    return {
      ...seo({
        title: sharedSeo?.title ?? `${player.name} — ${SITE_NAME}`,
        description: sharedSeo?.description ?? descParts.join(' '),
        path: `/player/${params.id}`,
        image: sharedSeo ? sharedSeo.image : avatar ?? undefined,
        type: 'profile',
      }),
      scripts: [jsonLd(schema)],
    }
  },
  component: RouteComponent,
})

function findEarnedAchievement<T extends { id: string; achievedOn: string | null }>(
  achievements: T[],
  id: string | undefined,
): (T & EarnedAchievement) | null {
  if (!id) return null
  const achievement = achievements.find((a) => a.id === id)
  return achievement?.achievedOn ? (achievement as T & EarnedAchievement) : null
}

function RouteComponent() {
  const { player, rankingTypes, rankingsData, tourneys, teams, paintingWins, achievements, typeCode } = Route.useLoaderData()
  const { painting: activePaintingId, achievement: activeAchievementId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const wins = paintingWins ?? []
  const activeAchievement = achievements && findEarnedAchievement(achievements, activeAchievementId)

  const activeWinner = activePaintingId ? wins.find((w: any) => w.id === activePaintingId) ?? null : null
  const activeWinnerForLightbox = activeWinner ? {
    id: activeWinner.id,
    imageKey: activeWinner.imageKey,
    imageWidth: activeWinner.imageWidth,
    imageHeight: activeWinner.imageHeight,
    playerName: player.name,
    playerId: player.id,
    model: activeWinner.model,
    description: activeWinner.description,
    categoryName: activeWinner.categoryName,
    position: activeWinner.position,
    totalWinners: activeWinner.totalWinners,
  } : null

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{player.name}</h2>
      <Tabs defaultValue="events">
        <Tabs.List>
          <Tabs.Tab value="events">Events</Tabs.Tab>
          <Tabs.Tab value="rankings">Rankings</Tabs.Tab>
          <Tabs.Tab value="teams">Teams</Tabs.Tab>
          {wins.length > 0 && <Tabs.Tab value="painting">Painting</Tabs.Tab>}
          {achievements && <Tabs.Tab value="achievements">{achievementsTabLabel(achievements)}</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="events">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-2 py-2 font-semibold">Event</th>
                <th className="px-2 py-2 text-right font-semibold">Points</th>
                <th className="px-2 py-2 font-semibold">Place</th>
                <th className="px-2 py-2 font-semibold">Faction</th>
                <th className="px-2 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {(tourneys as any[]).map((t: any) => (
                <tr key={t.tourneyId} className="border-b border-border">
                  <td className="px-2 py-1.5">
                    <Link to="/event/$id" params={{ id: t.tourneyId }} search={{ tab: undefined, painting: undefined }}>
                      {t.tourneyName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-right">{t.points.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{t.place}</td>
                  <td className="px-2 py-1.5">{t.factionName}</td>
                  <td className="px-2 py-1.5">
                    {t.date ? formatDate(new Date(t.date), 'd MMMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>

        <Tabs.Panel value="rankings">
          <select
            className="w-[200px] rounded border border-border px-2 py-1 text-sm"
            value={typeCode}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, typeCode: e.target.value || undefined }) })}
          >
            {rankingTypes.map((rt) => (
              <option key={rt.code} value={rt.code}>{rt.name}</option>
            ))}
          </select>
          {rankingsData.rankings.length > 0 ? (
            <PlayerRankingOverTime rankingsData={rankingsData as any} />
          ) : (
            <div>No ranking data available for {rankingTypes.find((rt) => rt.code === typeCode)?.name}.</div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="teams">
          {teams.length === 0 ? (
            <div>No team history.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-2 py-2 font-semibold">Team</th>
                  <th className="px-2 py-2 font-semibold">Joined</th>
                  <th className="px-2 py-2 font-semibold">Left</th>
                  <th className="px-2 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {(teams as any[]).map((m: any) => (
                  <tr key={m.membership_id ?? m.team_id} className="border-b border-border">
                    <td className="px-2 py-1.5">
                      <Link to="/team/$id" params={{ id: String(m.team_id) }} search={{ tab: undefined }}>
                        {m.team_name}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">{m.join_date ? formatDate(new Date(m.join_date), 'd MMMM yyyy') : '—'}</td>
                    <td className="px-2 py-1.5">{m.left_date ? formatDate(new Date(m.left_date), 'd MMMM yyyy') : 'Current'}</td>
                    <td className="px-2 py-1.5">
                      {m.is_captain && (
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          Captain
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="painting">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-2 py-2 font-semibold" />
                <th className="px-2 py-2 font-semibold">Event</th>
                <th className="px-2 py-2 font-semibold">Category</th>
                <th className="px-2 py-2 font-semibold">Position</th>
                <th className="px-2 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((w: any) => (
                <tr key={w.id} className="border-b border-border">
                  <td className="px-2 py-1.5">
                    {w.imageKey ? (
                      <span
                        className="inline-block cursor-pointer"
                        onClick={() => navigate({ search: (prev) => ({ ...prev, painting: w.id }) })}
                      >
                        <Image
                          imageKey={w.imageKey}
                          width={w.imageWidth}
                          height={w.imageHeight}
                          alt={w.categoryName}
                          fallbackWidth={150}
                          sizes="80px"
                          className="h-auto w-20 rounded-sm"
                        />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <Link to="/event/$id" params={{ id: w.tourneyId }} search={{ tab: 'best-painted', painting: undefined }}>
                      {w.tourneyName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{w.categoryName}</td>
                  <td className="px-2 py-1.5">{positionLabel(w.position, w.totalWinners)}</td>
                  <td className="px-2 py-1.5">
                    {w.tourneyDate ? formatDate(new Date(w.tourneyDate), 'd MMMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>

        {achievements && (
          <Tabs.Panel value="achievements">
            <div className="flex flex-col gap-6">
              {groupAchievements(achievements).map((group) => (
                <section key={group.name}>
                  <h3 className="mb-2 font-semibold">
                    {group.name}{' '}
                    <span className="font-normal text-muted-foreground">
                      ({earnedCount(group.achievements)}/{group.achievements.length})
                    </span>
                  </h3>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.achievements.map((a) => {
                      const earned = a.achievedOn !== null
                      return (
                        <li
                          key={a.id}
                          className={`flex gap-3 rounded-md border border-border bg-surface p-3 ${earned ? 'cursor-pointer hover:bg-muted' : 'text-muted-foreground'}`}
                          onClick={earned ? () => navigate({ search: (prev) => ({ ...prev, achievement: a.id }) }) : undefined}
                        >
                          <div className={`w-20 shrink-0 ${earned ? '' : 'opacity-50 grayscale'}`}>
                            {a.imageKey ? (
                              <Image
                                imageKey={a.imageKey}
                                width={a.imageWidth}
                                height={a.imageHeight}
                                alt={a.name}
                                fallbackWidth={150}
                                sizes="80px"
                                className="h-auto w-20 rounded-sm"
                              />
                            ) : (
                              <div className="flex aspect-square w-20 items-center justify-center rounded-sm bg-muted text-2xl" aria-hidden>
                                🏅
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 text-sm">
                            <h4 className="font-semibold">
                              {earned ? (
                                <button
                                  type="button"
                                  className="text-left hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate({ search: (prev) => ({ ...prev, achievement: a.id }) })
                                  }}
                                >
                                  {a.name}
                                </button>
                              ) : (
                                a.name
                              )}
                              <span className="sr-only">{earned ? ' (earned)' : ' (not yet earned)'}</span>
                            </h4>
                            {a.description.trim() && <p>{a.description}</p>}
                            {earned ? (
                              <p className="mt-1 text-muted-foreground">
                                Earned{' '}
                                {a.tourneyId && a.tourneyName && (
                                  <>
                                    at{' '}
                                    <Link
                                      to="/event/$id"
                                      params={{ id: a.tourneyId }}
                                      search={{ tab: undefined, painting: undefined }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {a.tourneyName}
                                    </Link>{' '}
                                  </>
                                )}
                                on {formatDate(parseISO(a.achievedOn!), 'd MMMM yyyy')}
                              </p>
                            ) : (
                              <p className="mt-1">Not yet earned</p>
                            )}
                            {earned && (
                              <ShareButton
                                className="mt-2"
                                url={achievementShareUrl(player.id, a.id)}
                                title={a.name}
                                text={achievementShareText(player.name, a.name)}
                              />
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </Tabs.Panel>
        )}
      </Tabs>

      {achievements && (
        <AchievementModal
          achievement={activeAchievement}
          playerId={player.id}
          playerName={player.name}
          onClose={() => navigate({ search: (prev) => ({ ...prev, achievement: undefined }) })}
        />
      )}

      <PaintingLightbox
        winner={activeWinnerForLightbox}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
      />
    </div>
  )
}
