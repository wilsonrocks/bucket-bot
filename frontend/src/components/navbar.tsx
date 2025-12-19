import { Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { useHasRole } from '@/hooks/useApi'
import { Route as EventsRoute } from '@/routes/app/_app-pages/events/index.tsx'

export const Navbar = () => {
  const hasRole = useHasRole()
  return (
    <Stack>
      {hasRole && <AppNavLink to={EventsRoute.path} label="Events" />}
    </Stack>
  )
}
