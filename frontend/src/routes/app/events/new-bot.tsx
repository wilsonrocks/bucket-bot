import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/events/new-bot')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/_app-pages/events/new-bot"!</div>
}
