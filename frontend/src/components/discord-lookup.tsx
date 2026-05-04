import {
  usePostMatchPlayerToDiscordUser,
  useGetSearchDiscordUsers,
} from '@/api/hooks'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'

export const DiscordLookup: React.FC<{
  initialText: string
  playerIdentityId: number
}> = ({ initialText, playerIdentityId }) => {
  const [text, setText] = useState(initialText)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  useEffect(() => {
    setText(initialText)
  }, [initialText])

  const options = useGetSearchDiscordUsers({ text })
  const matchMutation = usePostMatchPlayerToDiscordUser()

  useEffect(() => {
    if (!pendingUserId) return
    const timer = setTimeout(() => setPendingUserId(null), 4000)
    return () => clearTimeout(timer)
  }, [pendingUserId])

  const handleMatch = (discordUserId: string, displayName: string) => {
    if (pendingUserId !== discordUserId) {
      setPendingUserId(discordUserId)
      return
    }
    setPendingUserId(null)
    matchMutation.mutate(
      { data: { playerIdentityId, discordUserId } },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Matched',
            message: `${initialText} matched to ${displayName}`,
            color: 'green',
          })
        },
      },
    )
  }

  return (
    <Box>
      <TextInput
        label="Search for"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder="Enter Discord ID or Username"
        mb="sm"
      />
      {options.isLoading && <Text size="sm">Loading...</Text>}
      {options.isError && <Text size="sm" c="red">Error loading options</Text>}
      {options.data && (
        <Stack gap="xs">
          {options.data.map((option) => (
            <Box key={option.discord_user_id}>
              <Group wrap="nowrap" justify="space-between">
                <Group wrap="nowrap" gap="sm">
                  <Avatar src={option.discord_avatar_url ?? undefined} size="md" />
                  <Stack gap={2}>
                    <Text size="sm">{option.discord_display_name || option.discord_nickname}</Text>
                    <Text size="xs" c="dimmed">@{option.discord_username}</Text>
                  </Stack>
                </Group>
                <Button
                  size="compact-xs"
                  color={pendingUserId === option.discord_user_id ? 'yellow' : undefined}
                  loading={matchMutation.isPending}
                  onClick={() =>
                    handleMatch(
                      option.discord_user_id,
                      option.discord_display_name || option.discord_nickname || option.discord_username || 'Unknown',
                    )
                  }
                >
                  {pendingUserId === option.discord_user_id ? 'Confirm match?' : 'Match'}
                </Button>
              </Group>
              <Divider mt="xs" />
            </Box>
          ))}
        </Stack>
      )}
      {options.data && options.data.length === 0 && <Text size="sm">No results found</Text>}
    </Box>
  )
}
