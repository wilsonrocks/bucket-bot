import { fetchTourney } from '#/queries'
import { createFileRoute, notFound } from '@tanstack/react-router'
import z from 'zod'
import { Link } from '#/components/link'
import { Tabs } from '#/components/routed-tabs'
import { PaintingLightbox, positionLabel } from '#/components/painting-lightbox'

export const Route = createFileRoute('/event/$id')({
  params: z.object({ id: z.coerce.number() }),
  validateSearch: z.object({
    tab: z.enum(['results', 'best-painted']).optional(),
    painting: z.coerce.number().optional(),
  }),
  loader: async ({ params }) => {
    try {
      return await fetchTourney({ data: { id: params.id } })
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData }) => loaderData ? ({
    meta: [
      { title: `${(loaderData.tourney as any).name} — b(UK)et bot` },
      { property: 'og:title', content: (loaderData.tourney as any).name },
      { property: 'og:description', content: `Warhammer tournament: ${(loaderData.tourney as any).name}` },
    ],
  }) : {},
  component: RouteComponent,
})

function RouteComponent() {
  const { players, tourney, paintingCategories } = Route.useLoaderData()
  const { painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const t = tourney as any
  const cats = (paintingCategories as any[])

  const hasAnyImages = cats.some((cat: any) => (cat.winners ?? []).some((w: any) => w.imageKey))

  const activeWinner = activePaintingId
    ? cats.flatMap((cat: any) =>
        (cat.winners ?? []).map((w: any) => ({ ...w, categoryName: cat.name, totalWinners: cat.winners.length })),
      ).find((w: any) => w.id === activePaintingId) ?? null
    : null

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t.name}</h1>
      <Tabs defaultValue="results">
        <Tabs.List mb="md">
          <Tabs.Tab value="results">Results</Tabs.Tab>
          {hasAnyImages && <Tabs.Tab value="best-painted">Best Painted</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="results">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-2 py-2 font-semibold">Place</th>
                <th className="px-2 py-2 font-semibold">Name</th>
                <th className="px-2 py-2 font-semibold">Points</th>
                <th className="px-2 py-2 font-semibold">Faction</th>
              </tr>
            </thead>
            <tbody>
              {(players as any[]).map((row: any) => (
                <tr key={`${row.place}-${row.playerName}`} className="border-b border-gray-100">
                  <td className="px-2 py-1.5">{row.place}</td>
                  <td className="px-2 py-1.5">
                    {row.playerId != null ? (
                      <Link
                        to="/player/$id"
                        params={{ id: row.playerId }}
                        search={{ tab: undefined, typeCode: undefined, painting: undefined }}
                      >
                        {row.playerName}
                      </Link>
                    ) : (
                      row.playerName
                    )}
                  </td>
                  <td className="px-2 py-1.5">{row.points.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{row.factionName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Panel>

        <Tabs.Panel value="best-painted">
          {cats.map((cat: any) => {
            const winnersWithImages = (cat.winners ?? []).filter((w: any) => w.imageKey)
            if (winnersWithImages.length === 0) return null
            return (
              <div key={cat.id} className="mb-6">
                <h3 className="mb-2 text-lg font-semibold">{cat.name}</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {winnersWithImages.map((winner: any) => (
                    <div
                      key={winner.id}
                      className="w-[150px] cursor-pointer"
                      onClick={() => navigate({ search: (prev) => ({ ...prev, painting: winner.id }) })}
                    >
                      <img
                        src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w150.png`}
                        alt={`${winner.playerName} — ${cat.name}`}
                        className="w-[150px] rounded-sm"
                      />
                      <p className="mt-1 text-center text-xs text-gray-500">
                        {positionLabel(winner.position, cat.winners.length)} —{' '}
                        {winner.playerId != null ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Link
                              to="/player/$id"
                              params={{ id: winner.playerId }}
                              search={{ tab: 'painting', typeCode: undefined, painting: undefined }}
                            >
                              {winner.playerName}
                            </Link>
                          </span>
                        ) : (
                          winner.playerName
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Tabs.Panel>
      </Tabs>

      <PaintingLightbox
        winner={activeWinner}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
        linkPlayerName
      />
    </div>
  )
}
