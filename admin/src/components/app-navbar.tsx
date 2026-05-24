import { useGetUnmappedIdentities } from '@/api/hooks'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { Route as BotChat } from '@/routes/app/bot-chat'
import { Route as EventsAppRoute } from '@/routes/app/events'
import { Route as IdentitiesRoute } from '@/routes/app/identities'
import { Route as ImportRoute } from '@/routes/app/import'
import { Route as RankingsRoute } from '@/routes/app/rankings'
import { Route as PlayersRoute } from '@/routes/app/players/'
import { Route as TeamsRoute } from '@/routes/app/teams/'
import { Route as VenuesRoute } from '@/routes/app/venues'
import { Route as FeatureFlagsRoute } from '@/routes/app/feature-flags'

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
