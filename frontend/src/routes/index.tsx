import { Container, Stack, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

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
        {/* <Image src={BucketBotImage} alt="Bucket Bot" maw={200} /> */}
      </Stack>
    </Container>
  )
}
