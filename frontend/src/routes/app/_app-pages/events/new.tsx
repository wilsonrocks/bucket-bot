import { Modal } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Route as IndexRoute } from './index.tsx'

export const Route = createFileRoute('/app/_app-pages/events/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  return (
    <Modal
      opened={true}
      onClose={() => {
        navigate({ to: IndexRoute.path, from: '/' })
      }}
    >
      Hello "/app/_app-pages/events/new"!
    </Modal>
  )
}
