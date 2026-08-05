import {
  useDeletePlayerIdDiscordUser,
  useDeletePlayerIdentityIdPlayer,
  useGetPlayerId,
  useGetPlayerIdIdentities,
  useGetPlayerNameExistsPlayerId,
  useGetSearchDiscordUsers,
  useGetSearchPlayers,
  usePostPlayerIdentityIdIgnore,
  usePostPlayerIdMatchDiscordUser,
  usePostPlayerIdMergeIntoPlayer,
  usePutPlayerId,
} from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { SearchMatchList } from '@/components/search-match-list'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import z from 'zod'

export const Route = createFileRoute('/_app/players/$id')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  params: z.object({ id: z.string() }),
  staticData: { title: 'Edit Player' },
})

// The generated client hands back non-200 responses instead of throwing, and
// their messages carry the reason a merge or match was refused — an admin needs
// to see those rather than a silent no-op.
function notifyFailure(
  title: string,
  res: { status: number; data: { error?: string } },
) {
  notifications.show({
    title,
    message: res.data.error ?? `Request failed (${res.status})`,
    color: 'red',
  })
}

function IdentitiesPanel({ playerId }: { playerId: number }) {
  const { data: identities } = useGetPlayerIdIdentities(String(playerId))
  const ignoreMutation = usePostPlayerIdentityIdIgnore(playerId)
  const detachMutation = useDeletePlayerIdentityIdPlayer(playerId)

  const confirmDetach = (identity: { id: number; display_name: string }) =>
    modals.openConfirmModal({
      title: 'Remove identity from this player',
      centered: true,
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      children: (
        <Text size="sm">
          {`"${identity.display_name}" and its tournament results move off this player and back to the Identities page, where they can be reassigned. Until then those results don't score for anyone.`}
        </Text>
      ),
      onConfirm: () =>
        detachMutation.mutate(
          { id: identity.id },
          {
            onSuccess: (res) => {
              if (res.status !== 200) {
                notifyFailure('Could not remove identity', res)
                return
              }
              notifications.show({
                title: 'Removed',
                message: `${identity.display_name} is now unassigned`,
                color: 'green',
              })
            },
          },
        ),
    })

  return (
    <Paper withBorder p="md" mb="md">
      <Title order={5} mb="sm">
        Identities
      </Title>
      {!identities && <Text size="sm">Loading...</Text>}
      {identities && identities.length === 0 && (
        <Text size="sm" c="dimmed">
          This player has no identities.
        </Text>
      )}
      {identities && identities.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Provider</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>External ID</Table.Th>
              <Table.Th>Events</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {identities.map((identity) => (
              <Table.Tr key={identity.id}>
                <Table.Td>
                  <Badge variant="light">{identity.provider_name}</Badge>
                </Table.Td>
                <Table.Td>{identity.display_name}</Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {identity.external_id}
                  </Text>
                </Table.Td>
                <Table.Td>{identity.result_count}</Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      loading={ignoreMutation.isPending}
                      onClick={() =>
                        ignoreMutation.mutate({
                          id: identity.id,
                          data: { ignored: !identity.is_ignored },
                        })
                      }
                    >
                      {identity.is_ignored ? 'Un-ignore' : 'Ignore'}
                    </Button>
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-sm"
                      loading={detachMutation.isPending}
                      onClick={() => confirmDetach(identity)}
                    >
                      Remove
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  )
}

function UnlinkDiscordButton({
  playerId,
  discordName,
}: {
  playerId: number
  discordName: string
}) {
  const unlinkMutation = useDeletePlayerIdDiscordUser(playerId)

  const confirmUnlink = () =>
    modals.openConfirmModal({
      title: 'Unlink Discord account',
      centered: true,
      labels: { confirm: 'Unlink', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      children: (
        <Text size="sm">
          {`${discordName} will no longer be linked to this player, and loses any
          admin access that came with it until the account is linked again. The
          player keeps its name and identities — rename it below if it should
          now be someone else.`}
        </Text>
      ),
      onConfirm: () =>
        unlinkMutation.mutate(
          { id: playerId },
          {
            onSuccess: (res) => {
              if (res.status !== 200) {
                notifyFailure('Could not unlink', res)
                return
              }
              notifications.show({
                title: 'Unlinked',
                message: `${discordName} unlinked from this player`,
                color: 'green',
              })
            },
          },
        ),
    })

  return (
    <Button
      variant="subtle"
      color="red"
      size="compact-sm"
      loading={unlinkMutation.isPending}
      onClick={confirmUnlink}
    >
      Unlink
    </Button>
  )
}

function MatchDiscordPanel({
  playerId,
  playerName,
}: {
  playerId: number
  playerName: string
}) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState(playerName)
  const discordOptions = useGetSearchDiscordUsers({ text: searchText })
  const matchMutation = usePostPlayerIdMatchDiscordUser(playerId)

  return (
    <SearchMatchList
      label="Search for a Discord user"
      placeholder="Enter Discord ID or Username"
      initialText={playerName}
      onSearchTextChange={setSearchText}
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
          { id: playerId, data: { discordUserId: option.key } },
          {
            onSuccess: (res) => {
              if (res.status !== 200) {
                notifyFailure('Could not match', res)
                return
              }
              notifications.show({
                title: 'Matched',
                message: `${playerName} matched to ${option.primary}`,
                color: 'green',
              })
              // If that Discord user already had a player, this one was merged
              // into it and no longer exists — follow the survivor.
              if (res.data.playerId !== playerId) {
                navigate({
                  to: '/players/$id',
                  params: { id: String(res.data.playerId) },
                })
              }
            },
          },
        )
      }
    />
  )
}

function MergePanel({
  playerId,
  playerName,
}: {
  playerId: number
  playerName: string
}) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState(playerName)
  const playerOptions = useGetSearchPlayers({ text: searchText })
  const mergeMutation = usePostPlayerIdMergeIntoPlayer(playerId)

  return (
    <Paper withBorder p="md">
      <Title order={5} mb="sm">
        Merge this player into another
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        Identities, results and team memberships move to the target player, and
        this player is deleted. Its past ranking snapshots are deleted with it,
        so it disappears from historical rankings — this can't be undone. Future
        ranking runs score both sets of results under the target player.
      </Text>
      <SearchMatchList
        label="Search for the player to keep"
        placeholder="Enter player name"
        initialText={playerName}
        onSearchTextChange={setSearchText}
        options={playerOptions.data
          ?.filter((option) => option.id !== playerId)
          .map((option) => ({
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
            { id: playerId, data: { targetPlayerId: Number(option.key) } },
            {
              onSuccess: (res) => {
                if (res.status !== 200) {
                  notifyFailure('Could not merge', res)
                  return
                }
                notifications.show({
                  title: 'Merged',
                  message: `${playerName} merged into ${option.primary}`,
                  color: 'green',
                })
                navigate({ to: '/players/$id', params: { id: option.key } })
              },
            },
          )
        }
      />
    </Paper>
  )
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: player } = useGetPlayerId(id)
  const updatePlayer = usePutPlayerId(Number(id))

  const form = useForm<{ name: string; short_name: string }>({
    initialValues: { name: '', short_name: '' },
  })

  useEffect(() => {
    if (player) {
      form.setValues({ name: player.name, short_name: player.short_name ?? '' })
    }
  }, [player?.id])

  const [debouncedName] = useDebouncedValue(form.values.name, 300)
  const [debouncedShortName] = useDebouncedValue(form.values.short_name, 300)

  const checkName =
    !!player && debouncedName !== '' && debouncedName !== player.name
  const checkShortName =
    !!player &&
    debouncedShortName !== '' &&
    debouncedShortName !== (player.short_name ?? '')

  const nameExistenceCheck = useGetPlayerNameExistsPlayerId(
    id,
    { name: debouncedName },
    { query: { enabled: checkName } },
  )
  const shortNameExistenceCheck = useGetPlayerNameExistsPlayerId(
    id,
    { short_name: debouncedShortName },
    { query: { enabled: checkShortName } },
  )

  const showNameError =
    checkName && nameExistenceCheck.data?.exists
  const showShortNameError =
    checkShortName && shortNameExistenceCheck.data?.exists

  if (!player) return <div>Loading...</div>

  return (
    <div>
      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">
          Discord Account
        </Title>
        {player.discord_id ? (
          <Group justify="space-between">
            <Group>
              <Avatar src={player.discord_avatar_url ?? undefined} size="md" />
              <div>
                <Text size="sm" fw={500}>
                  {player.discord_display_name ?? '—'}
                </Text>
                <Text size="sm" c="dimmed">
                  {player.discord_username ? `@${player.discord_username}` : '—'}
                </Text>
              </div>
            </Group>
            <UnlinkDiscordButton
              playerId={player.id}
              discordName={
                player.discord_display_name ??
                player.discord_username ??
                'This Discord account'
              }
            />
          </Group>
        ) : (
          <>
            <Text size="sm" c="dimmed" mb="sm">
              No Discord linked — search for the right user below.
            </Text>
            <MatchDiscordPanel playerId={player.id} playerName={player.name} />
          </>
        )}
      </Paper>

      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">
          Edit Details
        </Title>
        <form
          onSubmit={form.onSubmit((values) => {
            updatePlayer.mutate({
              id,
              data: {
                name: values.name,
                short_name: values.short_name || null,
              },
            })
          })}
        >
          <TextInput
            label="Name"
            required
            {...form.getInputProps('name')}
            mb="sm"
            error={
              showNameError
                ? 'This name is already in use'
                : form.getInputProps('name').error
            }
          />
          <TextInput
            label="Short Name"
            {...form.getInputProps('short_name')}
            mb="sm"
            error={
              showShortNameError
                ? 'This short name is already in use'
                : form.getInputProps('short_name').error
            }
          />
          <Box>
            <Button
              type="submit"
              loading={updatePlayer.isPending}
              disabled={showNameError || showShortNameError}
            >
              Save
            </Button>
          </Box>
        </form>
      </Paper>

      <IdentitiesPanel playerId={player.id} />

      <MergePanel playerId={player.id} playerName={player.name} />
    </div>
  )
}
