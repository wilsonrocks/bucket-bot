import { Card, Text, Title } from '@mantine/core'

type CommunityStats = { totalPlayers: number; gamesPlayed: number; totalEvents: number }

export function CommunityStatsCard({ data }: { data: CommunityStats }) {
  return (
    <Card withBorder padding="md" h="100%" mih={160}>
      <Title order={3} mb="sm">Community Stats</Title>
      <Text>
        <Text span fw={700}>{data.totalPlayers.toLocaleString()}</Text>
        {' '}people have played{' '}
        <Text span fw={700}>{data.gamesPlayed.toLocaleString()}</Text>
        {' '}games at{' '}
        <Text span fw={700}>{data.totalEvents.toLocaleString()}</Text>
        {' '}event{data.totalEvents === 1 ? '' : 's'} so far!
      </Text>
    </Card>
  )
}
