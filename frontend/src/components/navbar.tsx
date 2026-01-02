import { Button, Divider, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { useGenerateRankingsSnapshotMutation, useHasRole } from '@/hooks/useApi'
import { Route as EventsSiteRoute } from '@/routes/site/events'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events/index.tsx'
import { Route as RankingsRoute } from '@/routes/site/rankings'
import { Route as DiscordMappingRoute } from '@/routes/app/discord-mapping'

export const Navbar = () => {
  const hasRole = useHasRole()
  const generateRankings = useGenerateRankingsSnapshotMutation()

  return (
    <Stack>
      <AppNavLink to={EventsSiteRoute.path} label="Events" />
      <AppNavLink to={RankingsRoute.path} label="Rankings" />
      {hasRole && (
        <>
          <Divider />
          <AppNavLink to={EventsAppRoute.path} label="Edit Events" />
          <AppNavLink to={DiscordMappingRoute.path} label="Discord Mapping" />
          <Button
            disabled={generateRankings.isPending}
            onClick={() => generateRankings.mutate()}
          >
            Generate a rankings snapshot
          </Button>
        </>
      )}
    </Stack>
  )
}
