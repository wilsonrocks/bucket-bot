import { Link } from '#/components/link'
import { Image } from '#/components/image'

type RecentPainting = {
  playerId: number | null
  playerName: string
  tourneyId: number
  tourneyName: string
  categoryName: string
  imageKey: string | null
  imageWidth: number | null
  imageHeight: number | null
  model: string | null
} | null

export function PaintingHighlightCard({ data }: { data: RecentPainting }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Latest Best Painted</h3>
      <div className="flex-1">
        {data ? (
          <>
            {data.imageKey && (
              <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-sm">
                <Image
                  imageKey={data.imageKey}
                  width={data.imageWidth}
                  height={data.imageHeight}
                  alt={data.playerName}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <p className="font-semibold">
              {data.playerId != null ? (
                <Link
                  to="/player/$id"
                  params={{ id: data.playerId }}
                  search={{ tab: 'painting', typeCode: undefined, painting: undefined }}
                >
                  {data.playerName}
                </Link>
              ) : (
                data.playerName
              )}
            </p>
            {data.model && <p className="text-sm text-muted-foreground">{data.model}</p>}
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                to="/event/$id"
                params={{ id: data.tourneyId }}
                search={{ tab: 'best-painted', painting: undefined }}
              >
                {data.tourneyName}
              </Link>
            </p>
          </>
        ) : null}
      </div>
      <Link to="/best-painted" search={{ painting: undefined }} className="mt-2 text-sm">
        All best painted →
      </Link>
    </div>
  )
}
