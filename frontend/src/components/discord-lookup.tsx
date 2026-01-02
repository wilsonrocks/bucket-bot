import { useSearchDiscordUsers } from '@/hooks/useApi'
import { Button, Divider, Group, Select, Stack, TextInput } from '@mantine/core'
import { useEffect, useState } from 'react'

export const DiscordLookup: React.FC<{
  initialText: string
  playerId: number
}> = ({ initialText, playerId }) => {
  const [text, setText] = useState('')
  useEffect(() => {
    setText(initialText)
  }, [initialText])
  const options = useSearchDiscordUsers(text)

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
                {option.discord_display_name} <b>@{option.discord_username}</b>
                <Button style={{ marginLeft: 'auto' }} size="compact-xs">
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
