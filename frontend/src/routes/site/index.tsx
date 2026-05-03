import { SimpleGrid } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { PaintingHighlightCard } from '@/components/home/painting-highlight-card'
import { TopPlayersCard } from '@/components/home/top-players-card'
import { RecentEventCard } from '@/components/home/recent-event-card'
import { RegionsMapCard } from '@/components/home/regions-map-card'
import { CommunityStatsCard } from '@/components/home/community-stats-card'
import { TeamStandingsCard } from '@/components/home/team-standings-card'
import { FactionCard } from '@/components/home/faction-card'

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
      <FactionCard />
    </SimpleGrid>
  )
}
