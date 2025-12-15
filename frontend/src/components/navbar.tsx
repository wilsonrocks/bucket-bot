import { Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { HasRankingReporterRole } from './auth'
import { Route as EventFormRoute } from '@/routes/app/_app-pages/event-form'

export const Navbar = () => {
  return (
    <Stack>
      <HasRankingReporterRole>
        <AppNavLink to={EventFormRoute.path} label="Event Form" />
      </HasRankingReporterRole>
    </Stack>
  )
}
