import { SimpleGrid } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { PaintingHighlightCard } from './_home/painting-highlight-card'
import { TopPlayersCard } from './_home/top-players-card'
import { RecentEventCard } from './_home/recent-event-card'
import { RegionsMapCard } from './_home/regions-map-card'
import { CommunityStatsCard } from './_home/community-stats-card'
import { TeamStandingsCard } from './_home/team-standings-card'

export const Route = createFileRoute('/site/')({
  component: HomePage,
  // staticData: { title: 'B(UK)et Bot' },
})

function HomePage() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      <TopPlayersCard />
      <PaintingHighlightCard />
      <TeamStandingsCard />
      <RegionsMapCard />
      <RecentEventCard />
      <CommunityStatsCard />
    </SimpleGrid>
  )
}
