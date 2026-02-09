import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/site')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Outlet />
    </div>
  )
}
