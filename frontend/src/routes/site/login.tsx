import { LoginButton } from '@/components/LoginButton'
import { Alert, Box, Center } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/site/login')({
  component: RouteComponent,
  staticData: {
    title: 'Admin Login',
  },
  validateSearch: z.object({
    unauthorized: z.boolean().optional(),
  }),
})

function RouteComponent() {
  const { unauthorized } = Route.useSearch()
  return (
    <Box>
      {unauthorized && (
        <Alert color="yellow" title="No access" mb="md">
          You don't have access to the admin area. You need to be a Ranking
          Reporter or Team Captain to use this section.
        </Alert>
      )}
      <Center>
        <LoginButton />
      </Center>
    </Box>
  )
}
