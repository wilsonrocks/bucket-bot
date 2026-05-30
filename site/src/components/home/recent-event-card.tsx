import { Link } from '#/components/link'
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
          search={{ tab: undefined, typeCode: undefined, painting: undefined }}
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
          search={{ tab: undefined, painting: undefined }}
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
