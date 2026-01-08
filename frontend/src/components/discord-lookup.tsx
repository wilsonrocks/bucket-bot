import {
  useMatchPlayerToDiscordUser,
  useGetDiscordUsersByText,
} from '@/hooks/useApi'
import {
  Box,
  Button,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import { modals } from '@mantine/modals'

export const DiscordLookup: React.FC<{
  initialText: string
  playerId: number
  playerName: string
}> = ({ initialText, playerId, playerName }) => {
  const [text, setText] = useState('')
  useEffect(() => {
    setText(initialText)
  }, [initialText])
  const options = useGetDiscordUsersByText(text)
  const matchMutation = useMatchPlayerToDiscordUser()
  return (
    <div>
      <TextInput
        label="Search for"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder="Enter Discord ID or Username"
        mb="sm"
      />
      {options.isLoading && <div>Loading...</div>}
      {options.isError && <div>Error loading options</div>}
      {options.data && (
        <Stack gap="xs">
          {options.data.map((option) => (
            <>
              <Group key={option.discord_user_id}>
                <img
                  width={50}
                  height={50}
                  src={option.discord_avatar_url}
                  alt="Avatar"
                />
                <Stack>
                  <span>
                    {option.discord_display_name || option.discord_nickname}
                  </span>{' '}
                  <b>@{option.discord_username}</b>
                </Stack>
                <Button
                  style={{ marginLeft: 'auto' }}
                  size="compact-xs"
                  onClick={() => {
                    modals.openConfirmModal({
                      title: 'Confirm Match',
                      centered: true,
                      labels: { confirm: 'Make it so', cancel: 'Wait...' },
                      onConfirm: () => {
                        matchMutation.mutate({
                          playerId,
                          discordUserId: option.discord_user_id,
                        })
                      },
                      children: (
                        <Box>
                          <Text>
                            Are you sure you want to match <em>{playerName}</em>{' '}
                            to {option.discord_display_name}(
                            <b>@{option.discord_username}</b>
                            )?
                          </Text>
                          <Text>
                            It will be a pain to undo this action because this
                            app is still being built.
                          </Text>
                        </Box>
                      ),
                    })
                  }}
                >
                  Match
                </Button>
              </Group>
              <Divider />
            </>
          ))}
        </Stack>
      )}
      {options.data && options.data.length === 0 && <div>No results found</div>}
    </div>
  )
}
