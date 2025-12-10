import {
  Button,
  Center,
  Container,
  Image,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import BucketBotImage from './bucket-bot.png'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <Container h="100vh">
      <Stack justify="center" align="center">
        <Title ta="center" mb="md" order={1}>
          bUKet bot
        </Title>
        <Text ta="center" mb="md">
          Eventually this will do things to do with rankings
        </Text>
        <Image src={BucketBotImage} alt="Bucket Bot" maw={200} />
        <Button
          onClick={() => {
            window.location.assign(import.meta.env.VITE_DISCORD_LOGIN_URL)
          }}
        >
          Login with Discord
        </Button>
      </Stack>
    </Container>
  )
}
