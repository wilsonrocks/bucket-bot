import { Button } from '@mantine/core'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/events/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Button component={Link} to="new-longshanks">
        New Longshanks Event
      </Button>
    </div>
  )
}
