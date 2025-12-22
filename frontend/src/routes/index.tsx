import { Button, Container, Stack, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useGenerateRankingsSnapshotMutation } from '@/hooks/useApi'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const generateRankings = useGenerateRankingsSnapshotMutation()
  return (
    <Container h="100vh">
      <Stack justify="center" align="center">
        <Text ta="center" mb="md">
          Eventually this will do things to do with rankings
        </Text>

        <Button
          disabled={generateRankings.isPending}
          onClick={() => generateRankings.mutate()}
        >
          Generate a rankings snapshot
        </Button>

        {/* <Image src={BucketBotImage} alt="Bucket Bot" maw={200} /> */}
      </Stack>
    </Container>
  )
}
