import { Card, Skeleton, Text, Title } from '@mantine/core'
import { useGetStatsCommunity } from '@/api/hooks'

export function CommunityStatsCard() {
  const { data, isLoading } = useGetStatsCommunity()

  return (
    <Card withBorder padding="md" h="100%" mih={160}>
      <Title order={3} mb="sm">Community Stats</Title>
      {isLoading || !data ? (
        <>
          <Skeleton height={16} mb={6} />
          <Skeleton height={16} width="80%" />
        </>
      ) : (
        <Text>
          <Text span fw={700}>{data.totalPlayers.toLocaleString()}</Text>
          {' '}people have played{' '}
          <Text span fw={700}>{data.gamesPlayed.toLocaleString()}</Text>
          {' '}games at{' '}
          <Text span fw={700}>{data.totalEvents.toLocaleString()}</Text>
          {' '}event{data.totalEvents === 1 ? '' : 's'} so far!
        </Text>
      )}
    </Card>
  )
}
