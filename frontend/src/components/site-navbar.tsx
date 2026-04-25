import { FeatureFlag } from './FeatureFlag'
import { Route as EventsSiteRoute } from '@/routes/site/_site-pages/events'
import { Route as FactionRankingsRoute } from '@/routes/site/_site-pages/faction-rankings'
import { Route as HowItWorksRoute } from '@/routes/site/_site-pages/how-it-works'
import { Route as PlayersRoute } from '@/routes/site/_site-pages/players'
import { Route as RankingsRoute } from '@/routes/site/_site-pages/rankings'
import { Route as RegionsRoute } from '@/routes/site/_site-pages/regions'
import { Route as TeamRankingsRoute } from '@/routes/site/_site-pages/team-rankings'
import { Route as TeamsRoute } from '@/routes/site/_site-pages/teams'
import { Divider, ScrollArea, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { Route as AppRoute } from '@/routes/app/route'

export const SiteNavbar = () => {
  return (
    <ScrollArea>
      <Stack>
        <AppNavLink to={EventsSiteRoute.to} label="Events" />
        <AppNavLink to={PlayersRoute.to} label="Players" />
        <AppNavLink to={RankingsRoute.to} label="Rankings" />
        <AppNavLink to={FactionRankingsRoute.to} label="Factions" />
        <AppNavLink to={TeamsRoute.to} label="Teams" />
        <FeatureFlag flag="TEAM_STATS">
          <AppNavLink to={TeamRankingsRoute.to} label="Team Rankings" />
        </FeatureFlag>
        <AppNavLink to={RegionsRoute.to} label="Regions" />
        <AppNavLink to={HowItWorksRoute.to} label="How It Works" />
        <Divider />
        <AppNavLink to={AppRoute.to} label="Admin" />
      </Stack>
    </ScrollArea>
  )
}
