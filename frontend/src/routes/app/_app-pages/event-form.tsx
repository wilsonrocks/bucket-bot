import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/event-form')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Event Form</div>
}
