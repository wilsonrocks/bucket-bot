import { fetchAllPainting } from '#/queries'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { Link } from '#/components/link'
import { PaintingLightbox, positionLabel } from '#/components/painting-lightbox'
import { Image } from '#/components/image'
import { SITE_NAME, seo } from '#/helpers/seo'

type PaintingItem = {
  id: number
  playerId: number | null
  playerName: string
  tourneyId: number
  tourneyName: string
  tourneyDate: string
  categoryId: number
  categoryName: string
  imageKey: string | null
  imageWidth: number | null
  imageHeight: number | null
  model: string | null
  description: string | null
  position: number
  totalWinners: number
}

function WinnerCard({ winner, onClick }: { winner: PaintingItem; onClick: () => void }) {
  const clickable = !!winner.imageKey
  return (
    <div
      className={`grid grid-rows-subgrid row-span-2 rounded-sm bg-surface ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-end">
        {winner.imageKey && (
          <Image
            imageKey={winner.imageKey}
            width={winner.imageWidth}
            height={winner.imageHeight}
            alt={winner.playerName}
            fallbackWidth={400}
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="h-auto w-full rounded-t-sm"
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 pb-3 pt-2">
        <p className="line-clamp-1 text-sm font-semibold">
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
        {(winner.model || winner.description) && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{winner.model ?? winner.description}</p>
        )}
        <p className="line-clamp-1 text-xs text-muted-foreground">
          <span onClick={(e) => e.stopPropagation()}>
            <Link
              to="/event/$id"
              params={{ id: winner.tourneyId }}
              search={{ tab: 'best-painted', painting: undefined }}
            >
              {winner.tourneyName}
            </Link>
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {winner.categoryName} — {positionLabel(winner.position, winner.totalWinners)}
        </p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/best-painted')({
  validateSearch: z.object({ painting: z.coerce.number().optional() }),
  staticData: { title: 'Best Painted' },
  loader: () => fetchAllPainting(),
  head: () =>
    seo({
      title: `Best Painted — ${SITE_NAME}`,
      description:
        'Best painted winners from UK Malifaux tournaments.',
      path: '/best-painted',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const { painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()

  const activeWinner = activePaintingId ? (data.find((w) => w.id === activePaintingId) ?? null) : null
  const lightboxWinner = activeWinner ? {
    id: activeWinner.id,
    imageKey: activeWinner.imageKey,
    imageWidth: activeWinner.imageWidth,
    imageHeight: activeWinner.imageHeight,
    playerName: activeWinner.playerName,
    playerId: activeWinner.playerId,
    model: activeWinner.model,
    description: activeWinner.description,
    categoryName: activeWinner.categoryName,
    position: activeWinner.position,
    totalWinners: activeWinner.totalWinners,
  } : null

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {data.map((winner) => (
          <WinnerCard
            key={winner.id}
            winner={winner}
            onClick={() => navigate({ search: (prev) => ({ ...prev, painting: winner.id }) })}
          />
        ))}
      </div>
      <PaintingLightbox
        winner={lightboxWinner}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
        linkPlayerName
      />
    </div>
  )
}
