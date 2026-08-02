import { useGetUnmappedIdentities } from '@/api/hooks'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { Route as BotChat } from '@/routes/_app/bot-chat'
import { Route as EventsAppRoute } from '@/routes/_app/events'
import { Route as UpcomingEventsRoute } from '@/routes/_app/events/upcoming'
import { Route as IdentitiesRoute } from '@/routes/_app/identities'
import { Route as ImportRoute } from '@/routes/_app/import'
import { Route as RankingsRoute } from '@/routes/_app/rankings'
import { Route as PlayersRoute } from '@/routes/_app/players/'
import { Route as TeamsRoute } from '@/routes/_app/teams/'
import { Route as VenuesRoute } from '@/routes/_app/venues'
import { Route as FeatureFlagsRoute } from '@/routes/_app/feature-flags'

import { Anchor, Badge, Divider, Group, ScrollArea, Stack, Text } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
export const AppNavbar = () => {
  const unmappedIdentities = useGetUnmappedIdentities()
  const { rankingReporter } = usePermissions()
  const auth = useAuth()

  return (
    <ScrollArea>
      <Stack>
        <Group gap="xs">
          <Text size="sm" fw={500}>{auth?.global_name ?? auth?.username}</Text>
          <Anchor size="sm" onClick={auth?.logout}>logout</Anchor>
        </Group>
        <Divider />
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
        {rankingReporter && (
          <AppNavLink to={UpcomingEventsRoute.to} label="Upcoming Events" />
        )}
        <AppNavLink to={TeamsRoute.to} label="Teams" />
        {rankingReporter && (
          <>
            <AppNavLink to={VenuesRoute.to} label="Venues" />
            <AppNavLink to={FeatureFlagsRoute.to} label="Feature Flags" />
            <AppNavLink to={BotChat.to} label="B(UK)et Bot Chat" />
          </>
        )}
        <Divider />
        <Anchor href="https://malifaux.uk" size="sm">Main Site ↗</Anchor>
      </Stack>
    </ScrollArea>
  )
}
