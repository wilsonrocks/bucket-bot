import { Route as EventsSiteRoute } from '@/routes/site/_site-pages/events'
import { Route as FactionRankingsRoute } from '@/routes/site/_site-pages/faction-rankings'
import { Route as RankingsRoute } from '@/routes/site/_site-pages/rankings'
import { Divider, ScrollArea, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { Route as AppRoute } from '@/routes/app/route'

export const SiteNavbar = () => {
  return (
    <ScrollArea>
      <Stack>
        <AppNavLink to={EventsSiteRoute.to} label="Events" />
        <AppNavLink to={RankingsRoute.to} label="Player Rankings" />
        <AppNavLink to={FactionRankingsRoute.to} label="Faction Rankings" />
        <Divider />
        <AppNavLink to={AppRoute.to} label="Admin" />
      </Stack>
    </ScrollArea>
  )
}
