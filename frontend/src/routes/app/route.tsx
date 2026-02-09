import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  beforeLoad() {
    const authString = localStorage.getItem('auth')

    if (!authString) {
      throw redirect({ to: '/' })
    }

    try {
      JSON.parse(authString)
    } catch (e) {
      console.error('Bad auth in storage', authString)
      throw redirect({ to: '/' })
    }
  },
  component: () => {
    return <Outlet />
  },
})
