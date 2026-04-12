import { useGetUnmappedIdentities } from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { Route as BotChat } from '@/routes/app/_app-pages/bot-chat'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events'
import { Route as IdentitiesRoute } from '@/routes/app/_app-pages/identities'
import { Route as ImportRoute } from '@/routes/app/_app-pages/import'
import { Route as RankingsRoute } from '@/routes/app/_app-pages/rankings'
import { Route as PlayersRoute } from '@/routes/app/_app-pages/players/'
import { Route as TeamsRoute } from '@/routes/app/_app-pages/teams/'
import { Route as VenuesRoute } from '@/routes/app/_app-pages/venues'

import { Badge, Divider, Group, ScrollArea, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { Route as SiteRoute } from '@/routes/site/route'

export const AppNavbar = () => {
  const unmappedIdentities = useGetUnmappedIdentities()
  const { rankingReporter } = usePermissions()

  return (
    <ScrollArea>
      <Stack>
        {rankingReporter && (
          <>
            <AppNavLink to={RankingsRoute.to} label="Rankings" />
            <AppNavLink to={ImportRoute.to} label="Import Events" />
            <AppNavLink to={EventsAppRoute.to} label="Edit Events" />
            <AppNavLink to={PlayersRoute.to} label="Players" />
            <AppNavLink
              to={IdentitiesRoute.to}
              label={
                <Group gap={3}>
                  <span>Identities</span>
                  {((unmappedIdentities.data && unmappedIdentities.data.length) ||
                    0) > 0 && (
                    <Badge color="red">{unmappedIdentities.data?.length}</Badge>
                  )}
                </Group>
              }
            />
          </>
        )}
        <AppNavLink to={TeamsRoute.to} label="Teams" />
        {rankingReporter && (
          <>
            <AppNavLink to={VenuesRoute.to} label="Venues" />
            <AppNavLink to={BotChat.to} label="B(UK)et Bot Chat" />
          </>
        )}
        <Divider />
        <AppNavLink to={SiteRoute.to} label="Main Site" />
      </Stack>
    </ScrollArea>
  )
}
