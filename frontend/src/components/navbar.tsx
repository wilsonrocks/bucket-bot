import { Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { HasRankingReporterRole } from './auth'
import { Route as EventsRoute } from '@/routes/app/_app-pages/events/index.tsx'

export const Navbar = () => {
  return (
    <Stack>
      <HasRankingReporterRole>
        <AppNavLink to={EventsRoute.path} label="Events" />
      </HasRankingReporterRole>
    </Stack>
  )
}
