import { useGetUnmappedIdentities } from '@/hooks/useApi'
import { Route as BotChat } from '@/routes/app/_app-pages/bot-chat'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events'
import { Route as IdentitiesRoute } from '@/routes/app/_app-pages/identities'
import { Route as ImportRoute } from '@/routes/app/_app-pages/import'
import { Route as RankingsRoute } from '@/routes/app/_app-pages/rankings'
import { Route as VenuesRoute } from '@/routes/app/_app-pages/venues'

import { Badge, Divider, Group, ScrollArea, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'

export const AppNavbar = () => {
  const unmappedIdentities = useGetUnmappedIdentities()

  return (
    <ScrollArea>
      <Stack>
        <AppNavLink to={RankingsRoute.to} label="Rankings" />
        <AppNavLink to={ImportRoute.to} label="Import Events" />
        <AppNavLink to={EventsAppRoute.to} label="Edit Events" />
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

        <AppNavLink to={VenuesRoute.to} label="Venues" />
        <AppNavLink to={BotChat.to} label="B(UK)et Bot Chat" />
        <Divider />
      </Stack>
    </ScrollArea>
  )
}
