import { useGetPlayerId, usePutPlayerId } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Avatar, Box, Button, Group, Paper, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
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

  if (!player) return <div>Loading...</div>

  return (
    <div>
      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">Discord Account</Title>
        <Group>
          <Avatar src={player.discord_avatar_url ?? undefined} size="md" />
          <div>
            <Text size="sm" fw={500}>{player.discord_display_name ?? '—'}</Text>
            <Text size="sm" c="dimmed">{player.discord_username ? `@${player.discord_username}` : 'No Discord linked'}</Text>
          </div>
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <Title order={5} mb="sm">Edit Details</Title>
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
          <TextInput label="Name" required {...form.getInputProps('name')} mb="sm" />
          <TextInput label="Short Name" {...form.getInputProps('short_name')} mb="sm" />
          <Box>
            <Button type="submit" loading={updatePlayer.isPending}>
              Save
            </Button>
          </Box>
        </form>
      </Paper>
    </div>
  )
}
