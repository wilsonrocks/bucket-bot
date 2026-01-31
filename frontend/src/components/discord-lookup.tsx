import {
  useMatchPlayerToDiscordUser,
  useSearchDiscordUsers,
} from '@/hooks/useApi'
import {
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { useEffect, useState } from 'react'

export const DiscordLookup: React.FC<{
  initialText: string
  playerIdentityId: number
}> = ({ initialText, playerIdentityId }) => {
  const [text, setText] = useState(initialText)

  // because this component will have prop changes and not be remounted we need this
  useEffect(() => {
    setText(initialText)
  }, [initialText])
  const options = useSearchDiscordUsers(text)
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
                          playerIdentityId,
                          discordUserId: option.discord_user_id,
                        })
                      },
                      children: (
                        <Box>
                          <Text>
                            Are you sure you want to match{' '}
                            <em>{initialText}</em> to{' '}
                            {option.discord_display_name}(
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
