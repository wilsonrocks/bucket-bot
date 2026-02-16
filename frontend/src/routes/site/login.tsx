import { LoginButton } from '@/components/LoginButton'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Center, Text } from '@mantine/core'

export const Route = createFileRoute('/site/login')({
  component: RouteComponent,
  staticData: {
    title: 'Admin Login',
  },
})

function RouteComponent() {
  return (
    <Box>
      <Text></Text>
      <Center>
        <LoginButton />
      </Center>
    </Box>
  )
}
