import {
  usePostMatchPlayerToDiscordUser,
  useGetSearchDiscordUsers,
  useGetSearchPlayers,
  usePostPlayerIdentityIdMergeIntoPlayer,
} from '@/api/hooks'
import { Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { SearchMatchList } from './search-match-list'

export const DiscordLookup: React.FC<{
  initialText: string
  playerIdentityId: number
}> = ({ initialText, playerIdentityId }) => {
  const [discordText, setDiscordText] = useState(initialText)
  const [playerText, setPlayerText] = useState(initialText)

  const discordOptions = useGetSearchDiscordUsers({ text: discordText })
  const playerOptions = useGetSearchPlayers({ text: playerText })
  const matchMutation = usePostMatchPlayerToDiscordUser()
  const mergeMutation = usePostPlayerIdentityIdMergeIntoPlayer()

  return (
    <Tabs defaultValue="discord">
      <Tabs.List mb="sm">
        <Tabs.Tab value="discord">Match Discord user</Tabs.Tab>
        <Tabs.Tab value="player">Merge into existing player</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="discord">
        <SearchMatchList
          label="Search for"
          placeholder="Enter Discord ID or Username"
          initialText={initialText}
          onSearchTextChange={setDiscordText}
          options={discordOptions.data?.map((option) => ({
            key: option.discord_user_id,
            avatarUrl: option.discord_avatar_url,
            primary:
              option.discord_display_name ||
              option.discord_nickname ||
              option.discord_username ||
              'Unknown',
            secondary: option.discord_username && `@${option.discord_username}`,
          }))}
          isLoading={discordOptions.isLoading}
          isError={discordOptions.isError}
          actionLabel="Match"
          confirmLabel="Confirm match?"
          isPending={matchMutation.isPending}
          onConfirm={(option) =>
            matchMutation.mutate(
              { data: { playerIdentityId, discordUserId: option.key } },
              {
                onSuccess: () => {
                  notifications.show({
                    title: 'Matched',
                    message: `${initialText} matched to ${option.primary}`,
                    color: 'green',
                  })
                },
              },
            )
          }
        />
      </Tabs.Panel>

      <Tabs.Panel value="player">
        <SearchMatchList
          label="Search for existing player"
          placeholder="Enter player name"
          initialText={initialText}
          onSearchTextChange={setPlayerText}
          options={playerOptions.data?.map((option) => ({
            key: String(option.id),
            avatarUrl: option.discord_avatar_url,
            primary: option.name,
            secondary: option.discord_username && `@${option.discord_username}`,
          }))}
          isLoading={playerOptions.isLoading}
          isError={playerOptions.isError}
          actionLabel="Merge"
          confirmLabel="Confirm merge?"
          isPending={mergeMutation.isPending}
          onConfirm={(option) =>
            mergeMutation.mutate(
              {
                id: playerIdentityId,
                data: { targetPlayerId: Number(option.key) },
              },
              {
                onSuccess: () => {
                  notifications.show({
                    title: 'Merged',
                    message: `${initialText} merged into ${option.primary}`,
                    color: 'green',
                  })
                },
              },
            )
          }
        />
      </Tabs.Panel>
    </Tabs>
  )
}
