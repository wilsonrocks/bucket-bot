import { createFileRoute } from '@tanstack/react-router'

import z from 'zod'

const LoggedInSearchParams = z.object({
  code: z.string(),
})

export const Route = createFileRoute('/logged-in')({
  component: RouteComponent,
  validateSearch: LoggedInSearchParams,
})

function RouteComponent() {
  const search = Route.useSearch()

  return <div>Howdy UK Malifaux Mod! Your code is: {search.code}</div>
}
