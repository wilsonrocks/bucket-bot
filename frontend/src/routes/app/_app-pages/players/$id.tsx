import {
  useGetPlayerId,
  useGetPlayerNameExists,
  usePutPlayerId,
} from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import {
  Avatar,
  Box,
  Button,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

export const Route = createFileRoute('/app/_app-pages/players/$id')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  params: z.object({ id: z.string() }),
  staticData: { title: 'Edit Player' },
})

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

  const nameExistenceCheck = useGetPlayerNameExists(
    { name: debouncedName },
    { query: { enabled: checkName } },
  )
  const shortNameExistenceCheck = useGetPlayerNameExists(
    { short_name: debouncedShortName },
    { query: { enabled: checkShortName } },
  )

  const showNameError =
    nameExistenceCheck.data && nameExistenceCheck.data.exists
  const showShortNameError =
    shortNameExistenceCheck.data && shortNameExistenceCheck.data.exists

  if (!player) return <div>Loading...</div>

  return (
    <div>
      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">
          Discord Account
        </Title>
        <Group>
          <Avatar src={player.discord_avatar_url ?? undefined} size="md" />
          <div>
            <Text size="sm" fw={500}>
              {player.discord_display_name ?? '—'}
            </Text>
            <Text size="sm" c="dimmed">
              {player.discord_username
                ? `@${player.discord_username}`
                : 'No Discord linked'}
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder p="md">
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
    </div>
  )
}
