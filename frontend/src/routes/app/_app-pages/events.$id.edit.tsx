import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

const eventParamsValidator = z.object({ id: z.number() })

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: RouteComponent,
  validateSearch: eventParamsValidator,
})

function RouteComponent() {
  return <div>Hello "/app/_app-pages/events/$id/edit"!</div>
}
