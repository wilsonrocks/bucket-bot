import {
  useGetBotChatChannels,
  usePostBotChatClearTestChannel,
  usePostBotChatPostMessage,
} from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { modals } from '@mantine/modals'
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

export const Route = createFileRoute('/app/_app-pages/bot-chat')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: {
    title: 'Bot Chat',
  },
})

function RouteComponent() {
  const { data: channelData } = useGetBotChatChannels()
  const postMessageMutation = usePostBotChatPostMessage()
  const clearTestChannelMutation = usePostBotChatClearTestChannel()

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
                  value: channel.id ?? '',
                  label: channel.name ?? '',
                }))}
                value={channelId}
                onChange={setChannelId}
              />
              <Button
                disabled={!channelId || !message}
                onClick={() => {
                  if (channelId && message)
                    postMessageMutation.mutate(
                      { data: { channelId, message } },
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
      <Box mt="xl">
        <Title order={4}>Test Channel</Title>
        <Button
          color="red"
          mt="sm"
          loading={clearTestChannelMutation.isPending}
          onClick={() =>
            modals.openConfirmModal({
              title: 'Clear Test Channel',
              centered: true,
              children: 'This will delete all messages in the test channel. Are you sure?',
              labels: { confirm: 'Clear it', cancel: 'Cancel' },
              confirmProps: { color: 'red' },
              onConfirm: () => clearTestChannelMutation.mutate(),
            })
          }
        >
          Clear Test Channel
        </Button>
      </Box>
    </div>
  )
}
