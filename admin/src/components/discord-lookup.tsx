import {
  usePostMatchPlayerToDiscordUser,
  useGetSearchDiscordUsers,
  useGetSearchPlayers,
  usePostPlayerIdentityIdMergeIntoPlayer,
} from '@/api/hooks'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'

export const DiscordLookup: React.FC<{
  initialText: string
  playerIdentityId: number
}> = ({ initialText, playerIdentityId }) => {
  const [discordText, setDiscordText] = useState(initialText)
  const [playerText, setPlayerText] = useState(initialText)
  const [pendingDiscordUserId, setPendingDiscordUserId] = useState<string | null>(null)
  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null)

  useEffect(() => {
    setDiscordText(initialText)
    setPlayerText(initialText)
  }, [initialText])

  const discordOptions = useGetSearchDiscordUsers({ text: discordText })
  const playerOptions = useGetSearchPlayers({ text: playerText })
  const matchMutation = usePostMatchPlayerToDiscordUser()
  const mergeMutation = usePostPlayerIdentityIdMergeIntoPlayer()

  useEffect(() => {
    if (!pendingDiscordUserId) return
    const timer = setTimeout(() => setPendingDiscordUserId(null), 4000)
    return () => clearTimeout(timer)
  }, [pendingDiscordUserId])

  useEffect(() => {
    if (!pendingPlayerId) return
    const timer = setTimeout(() => setPendingPlayerId(null), 4000)
    return () => clearTimeout(timer)
  }, [pendingPlayerId])

  const handleMatchDiscord = (discordUserId: string, displayName: string) => {
    if (pendingDiscordUserId !== discordUserId) {
      setPendingDiscordUserId(discordUserId)
      return
    }
    setPendingDiscordUserId(null)
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

  const handleMerge = (targetPlayerId: number, targetPlayerName: string) => {
    if (pendingPlayerId !== targetPlayerId) {
      setPendingPlayerId(targetPlayerId)
      return
    }
    setPendingPlayerId(null)
    mergeMutation.mutate(
      { id: playerIdentityId, data: { targetPlayerId } },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Merged',
            message: `${initialText} merged into ${targetPlayerName}`,
            color: 'green',
          })
        },
      },
    )
  }

  return (
    <Tabs defaultValue="discord">
      <Tabs.List mb="sm">
        <Tabs.Tab value="discord">Match Discord user</Tabs.Tab>
        <Tabs.Tab value="player">Merge into existing player</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="discord">
        <Box>
          <TextInput
            label="Search for"
            value={discordText}
            onChange={(e) => setDiscordText(e.currentTarget.value)}
            placeholder="Enter Discord ID or Username"
            mb="sm"
          />
          {discordOptions.isLoading && <Text size="sm">Loading...</Text>}
          {discordOptions.isError && <Text size="sm" c="red">Error loading options</Text>}
          {discordOptions.data && (
            <Stack gap="xs">
              {discordOptions.data.map((option) => (
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
                      color={pendingDiscordUserId === option.discord_user_id ? 'yellow' : undefined}
                      loading={matchMutation.isPending}
                      onClick={() =>
                        handleMatchDiscord(
                          option.discord_user_id,
                          option.discord_display_name || option.discord_nickname || option.discord_username || 'Unknown',
                        )
                      }
                    >
                      {pendingDiscordUserId === option.discord_user_id ? 'Confirm match?' : 'Match'}
                    </Button>
                  </Group>
                  <Divider mt="xs" />
                </Box>
              ))}
            </Stack>
          )}
          {discordOptions.data && discordOptions.data.length === 0 && <Text size="sm">No results found</Text>}
        </Box>
      </Tabs.Panel>

      <Tabs.Panel value="player">
        <Box>
          <TextInput
            label="Search for existing player"
            value={playerText}
            onChange={(e) => setPlayerText(e.currentTarget.value)}
            placeholder="Enter player name"
            mb="sm"
          />
          {playerOptions.isLoading && <Text size="sm">Loading...</Text>}
          {playerOptions.isError && <Text size="sm" c="red">Error loading options</Text>}
          {playerOptions.data && (
            <Stack gap="xs">
              {playerOptions.data.map((option) => (
                <Box key={option.id}>
                  <Group wrap="nowrap" justify="space-between">
                    <Group wrap="nowrap" gap="sm">
                      <Avatar src={option.discord_avatar_url ?? undefined} size="md" />
                      <Stack gap={2}>
                        <Text size="sm">{option.name}</Text>
                        {option.discord_username && (
                          <Text size="xs" c="dimmed">@{option.discord_username}</Text>
                        )}
                      </Stack>
                    </Group>
                    <Button
                      size="compact-xs"
                      color={pendingPlayerId === option.id ? 'yellow' : undefined}
                      loading={mergeMutation.isPending}
                      onClick={() => handleMerge(option.id, option.name)}
                    >
                      {pendingPlayerId === option.id ? 'Confirm merge?' : 'Merge'}
                    </Button>
                  </Group>
                  <Divider mt="xs" />
                </Box>
              ))}
            </Stack>
          )}
          {playerOptions.data && playerOptions.data.length === 0 && <Text size="sm">No results found</Text>}
        </Box>
      </Tabs.Panel>
    </Tabs>
  )
}
