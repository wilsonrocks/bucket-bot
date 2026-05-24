import { Divider, ScrollArea, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'

export const SiteNavbar = () => {
  return (
    <ScrollArea>
      <Stack>
        <AppNavLink to="/events" label="Events" />
        <AppNavLink to="/players" label="Players" />
        <AppNavLink to="/rankings" label="Rankings" />
        <AppNavLink to="/faction-rankings" label="Factions" />
        <AppNavLink to="/teams" label="Teams" />
        <AppNavLink to="/team-rankings" label="Team Rankings" />
        <AppNavLink to="/regions" label="Regions" />
        <AppNavLink to="/best-painted" label="Best Painted" />
        <AppNavLink to="/how-it-works" label="How It Works" />
        <Divider />
        <AppNavLink to={import.meta.env.VITE_ADMIN_SITE_URL} label="Admin" fuzzy={false} />
      </Stack>
    </ScrollArea>
  )
}
