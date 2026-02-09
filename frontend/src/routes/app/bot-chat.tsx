import {
  useGetDiscordBotChannels,
  usePostMessageToDiscordChannel,
} from '@/hooks/useApi'
import {
  Box,
  Button,
  Group,
  Select,
  Stack,
  Textarea,
  Title,
} from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/bot-chat')({
  component: RouteComponent,
  staticData: {
    title: 'Bot Chat',
  },
})

function RouteComponent() {
  const { data: channelData } = useGetDiscordBotChannels()
  const postMessageMutation = usePostMessageToDiscordChannel()

  const [channelId, setChannelId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')
  return (
    <div>
      {channelData && (
        <Box>
          <Title order={4}>Bot Chat Page Post to Channel</Title>
          <Group align="flex-start">
            <Stack gap="md">
              <Select
                searchable
                label="Channel"
                data={channelData.map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                }))}
                value={channelId}
                onChange={setChannelId}
              />
              <Button
                disabled={!channelId || !message}
                onClick={() => {
                  if (channelId && message)
                    postMessageMutation.mutate(
                      { channelId, message },
                      {
                        onSuccess: () => {
                          setMessage('')
                        },
                      },
                    )
                }}
              >
                Send Message
              </Button>
            </Stack>
            <Textarea
              w="60%"
              h="5rem"
              label="Text to Post"
              value={message}
              onChange={(event) => setMessage(event.currentTarget.value)}
            />
          </Group>
        </Box>
      )}
    </div>
  )
}
