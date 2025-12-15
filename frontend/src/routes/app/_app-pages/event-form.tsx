import { Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/event-form')({
  component: RouteComponent,
})

console.log(Route.path)
function RouteComponent() {
  return (
    <div>
      <Title>Event Form Page</Title>
      <Text>
        This is where the event form will go. You should only see it if you have
        the ranking reporter role.
      </Text>
    </div>
  )
}
