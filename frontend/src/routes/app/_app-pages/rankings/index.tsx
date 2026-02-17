import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/rankings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/_app-pages/rankings/"!</div>
}
