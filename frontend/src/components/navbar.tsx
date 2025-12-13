import { Stack } from '@mantine/core'
import { AppNavLink } from './app-nav-link'
import { Route as EventFormRoute } from '@/routes/app/_app-pages/event-form'

export const Navbar = () => {
  return (
    <Stack>
      <AppNavLink to={EventFormRoute.path} label="Event Form" />
    </Stack>
  )
}
