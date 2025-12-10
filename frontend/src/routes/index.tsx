import { Button, Container, Image, Stack, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import BucketBotImage from './bucket-bot.png'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <Container h="100vh">
      <Stack justify="center" align="center">
        <Text ta="center" mb="md">
          Eventually this will do things to do with rankings
        </Text>
        <Image src={BucketBotImage} alt="Bucket Bot" maw={200} />
        <Button
          onClick={() => {
            const redirectUri = new URL(
              '/logged-in',
              window.location.origin,
            ).toString()
            const params = new URLSearchParams({
              client_id: '1447679317302837411',
              response_type: 'code',
              redirect_uri: redirectUri,
              scope: 'identify',
            })
            window.location.assign(
              `${import.meta.env.VITE_DISCORD_LOGIN_URL}?${params.toString()}`,
            )
          }}
        >
          Login with Discord
        </Button>
      </Stack>
    </Container>
  )
}
