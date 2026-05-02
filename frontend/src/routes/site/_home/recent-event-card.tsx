import { Anchor, Card, Divider, Skeleton, Stack, Text, Title } from '@mantine/core'
import { Link } from '@/components/link'
import { useGetTourney, useGetTourneyId } from '@/api/hooks'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import { Route as EventRoute } from '@/routes/site/_site-pages/event.$id'
import { formatDate } from 'date-fns'

type Player = {
  place: number
  playerId: number | null
  playerName: string
  points: number
  factionName: string
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <Text size="sm">
      <Text span c="dimmed">#{player.place} </Text>
      {player.playerId != null ? (
        <Link to={PlayerRoute.to} params={{ id: player.playerId }} search={{ tab: undefined }}>
          {player.playerName}
        </Link>
      ) : (
        player.playerName
      )}
      <Text span c="dimmed"> · {player.factionName}</Text>
    </Text>
  )
}

export function RecentEventCard() {
  const { data: tourneyList, isLoading: listLoading } = useGetTourney()
  const latestId = tourneyList?.[0]?.id
  const { data: detail, isLoading: detailLoading } = useGetTourneyId(
    String(latestId ?? ''),
    { query: { enabled: latestId != null } },
  )

  const isLoading = listLoading || (latestId != null && detailLoading)

  const tourney = tourneyList?.[0]
  const players = (detail?.players as Player[] | undefined) ?? []
  const top3 = players.slice(0, 3)
  const spoon = players.length > 3 ? players[players.length - 1] : null

  return (
    <Card withBorder padding="md" h="100%" mih={280} style={{ display: 'flex', flexDirection: 'column' }}>
      <Title order={3} mb="sm">Latest Event</Title>
      <div style={{ flex: 1 }}>
        {isLoading ? (
          <Stack gap={8}>
            <Skeleton height={18} width="70%" />
            <Skeleton height={14} width="40%" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={16} />
            ))}
          </Stack>
        ) : tourney ? (
          <>
            <Anchor component={Link} to={EventRoute.to} params={{ id: tourney.id }} search={{ tab: undefined }} fw={600}>
              {tourney.name}
            </Anchor>
            {tourney.date && (
              <Text size="sm" c="dimmed" mb="xs">
                {formatDate(new Date(tourney.date), 'd MMM yyyy')}
                {tourney.venue ? ` · ${tourney.venue}` : ''}
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
          </>
        ) : null}
      </div>
    </Card>
  )
}
