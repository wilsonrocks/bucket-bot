import { useLocalStorage } from '@mantine/hooks'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'
import { Route as AppRoute } from './app/route'

const LoggedInSearchParams = z.object({
  code: z.string(),
})

export const Route = createFileRoute('/logged-in')({
  component: RouteComponent,
  validateSearch: LoggedInSearchParams,
  beforeLoad: async (context) => {
    const { code } = context.search

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/v1/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    )

    if (!response.ok) throw new Error('problem getting token')

    const json = await response.json()
    localStorage.setItem('auth', JSON.stringify(json))
    throw redirect({ to: AppRoute.to })
  },
})

function RouteComponent() {
  const search = Route.useSearch()
  const [authData] = useLocalStorage<{
    jwt: string
    username: string
    global_name: string
  }>({ key: 'auth' })
  useEffect(() => {}, [search.code])
  return (
    <div>
      Howdy {authData.global_name}({authData.username})!
    </div>
  )
}
