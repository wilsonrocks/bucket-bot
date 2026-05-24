import { Card, Divider, Stack, Text, Title } from '@mantine/core'
import { Link } from '@/components/link'
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
    <Text size="sm">
      <Text span c="dimmed">#{player.place} </Text>
      {player.playerId != null ? (
        <Link to="/player/$id" params={{ id: player.playerId }} search={{ tab: undefined, typeCode: undefined, painting: undefined }}>
          {player.playerName}
        </Link>
      ) : (
        player.playerName
      )}
      <Text span c="dimmed"> · {player.factionName}</Text>
    </Text>
  )
}

export function RecentEventCard({ data }: { data: RecentEvent }) {
  if (!data) return null

  const top3 = data.players.slice(0, 3)
  const spoon = data.players.length > 3 ? data.players[data.players.length - 1] : null

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Latest Event</Title>
      <div style={{ flex: 1 }}>
        <Link to="/event/$id" params={{ id: data.id }} search={{ tab: undefined, painting: undefined }} fw={600}>
          {data.name}
        </Link>
        {data.date && (
          <Text size="sm" c="dimmed" mb="xs">
            {formatDate(new Date(data.date), 'd MMM yyyy')}
            {data.venue ? ` · ${data.venue}` : ''}
          </Text>
        )}
        <Stack gap={4}>
          {top3.map((p) => <PlayerRow key={p.place} player={p} />)}
          {spoon && (
            <>
              <Divider my={4} />
              <Text size="xs" c="dimmed">Wooden spoon</Text>
              <PlayerRow player={spoon} />
            </>
          )}
        </Stack>
      </div>
    </Card>
  )
}
