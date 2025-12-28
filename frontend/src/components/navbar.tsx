import { Divider, Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { useHasRole } from '@/hooks/useApi'
import { Route as EventsSiteRoute } from '@/routes/site/events'
import { Route as EventsAppRoute } from '@/routes/app/_app-pages/events/index.tsx'
import { Route as RankingsRoute } from '@/routes/site/rankings'

export const Navbar = () => {
  const hasRole = useHasRole()
  return (
    <Stack>
      <AppNavLink to={EventsSiteRoute.path} label="Events" />
      <AppNavLink to={RankingsRoute.path} label="Rankings" />
      {hasRole && (
        <>
          <Divider />
          <AppNavLink to={EventsAppRoute.path} label="Edit Events" />
        </>
      )}
    </Stack>
  )
}
