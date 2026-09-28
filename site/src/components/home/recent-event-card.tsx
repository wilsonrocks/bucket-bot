import { Link } from '#/components/link'
import { Image } from '#/components/image'
import { formatDate } from 'date-fns'

type Player = {
  place: number
  playerId: number | null
  playerName: string
  points: number
  factionName: string
}

type RecentEvent = {
  id: number
  name: string
  date: string | null
  venue: string | null
  photo: {
    id: number
    imageKey: string
    caption: string | null
    imageWidth: number | null
    imageHeight: number | null
  } | null
  players: Player[]
} | null

function PlayerRow({ player }: { player: Player }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">#{player.place} </span>
      {player.playerId != null ? (
        <Link
          to="/player/$id"
          params={{ id: player.playerId }}
          search={{ tab: undefined, typeCode: undefined, painting: undefined, achievement: undefined }}
        >
          {player.playerName}
        </Link>
      ) : (
        player.playerName
      )}
      <span className="text-muted-foreground"> · {player.factionName}</span>
    </p>
  )
}

export function RecentEventCard({ data }: { data: RecentEvent }) {
  if (!data) return null

  const top3 = data.players.slice(0, 3)
  const spoon = data.players.length > 3 ? data.players[data.players.length - 1] : null

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Latest Event</h3>
      <div className="flex-1">
        <Link
          to="/event/$id"
          params={{ id: data.id }}
          search={{ tab: undefined, painting: undefined, photo: undefined }}
          className="font-semibold"
        >
          {data.name}
        </Link>
        {data.date && (
          <p className="mb-2 text-sm text-muted-foreground">
            {formatDate(new Date(data.date), 'd MMM yyyy')}
            {data.venue ? ` · ${data.venue}` : ''}
          </p>
        )}
        {data.photo && (
          <Link
            to="/event/$id"
            params={{ id: data.id }}
            search={{ tab: 'photos', painting: undefined, photo: data.photo.id }}
            className="mb-2 block aspect-[4/3] w-full overflow-hidden rounded-sm"
          >
            <Image
              imageKey={data.photo.imageKey}
              width={data.photo.imageWidth}
              height={data.photo.imageHeight}
              alt={data.photo.caption ?? data.name}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              fallbackWidth={400}
              className="h-full w-full object-contain"
            />
          </Link>
        )}
        <div className="flex flex-col gap-1">
          {top3.map((p) => (
            <PlayerRow key={p.place} player={p} />
          ))}
          {spoon && (
            <>
              <hr className="my-1 border-border" />
              <p className="text-xs text-muted-foreground">Wooden spoon</p>
              <PlayerRow player={spoon} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
