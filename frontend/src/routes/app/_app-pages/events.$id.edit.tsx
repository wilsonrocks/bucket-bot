import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/events/$id/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/_app-pages/events/$id/edit"!</div>
}
