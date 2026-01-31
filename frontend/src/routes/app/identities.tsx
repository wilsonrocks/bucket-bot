import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/identities')({
  component: RouteComponent,
  staticData: { title: 'Identities' },
})

function RouteComponent() {
  return <div>Hello "/app/identities"!</div>
}
