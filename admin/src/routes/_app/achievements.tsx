import {
  uploadTeamImage,
  useGetAchievements,
  usePostAchievementsAnnounceNext,
  usePostAchievementsSync,
  usePutAchievementsId,
} from '@/api/hooks'
import { Link } from '@/components/link'
import { Route as RunsRoute } from '@/routes/_app/rankings/runs'
import type { GetAchievements200Item } from '@/api/generated/bucketBotAPI.schemas'
import { ImageUploader } from '@/components/ImageUploader'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import {
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/achievements')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Achievements' },
})

function RouteComponent() {
  const { data: achievements } = useGetAchievements()
  const syncAchievements = usePostAchievementsSync()
  const announceNext = usePostAchievementsAnnounceNext()

  if (!achievements) return <div>Loading...</div>

  const pending = achievements.reduce((n, a) => n + a.unannounced_count, 0)

  return (
    <Stack>
      <Paper withBorder p="md">
        <Text mb="sm">
          Achievements are recalculated from event results{' '}
          <strong>every 30 minutes</strong>. During UK working hours (Mon–Fri
          09:00–17:30) each run also posts one player's new achievements to
          Discord. Use these buttons to run either step now. Manual runs are
          recorded on the pipeline runs page.
        </Text>
        <Group>
          <Button
            loading={syncAchievements.isPending}
            onClick={() => syncAchievements.mutate()}
          >
            Recalculate achievements
          </Button>
          <Button
            variant="light"
            disabled={pending === 0}
            loading={announceNext.isPending}
            onClick={() =>
              modals.openConfirmModal({
                title: 'Announce achievements now',
                children: (
                  <Text>
                    This posts the achievements of the player who has waited
                    longest to Discord, pinging them. It ignores working hours.
                    {' '}
                    {pending} achievement{pending === 1 ? '' : 's'} waiting.
                  </Text>
                ),
                onConfirm: () => announceNext.mutate(),
                labels: { confirm: 'Post it', cancel: 'Cancel' },
              })
            }
          >
            Announce next player
          </Button>
          <Button component={Link} to={RunsRoute.to} variant="subtle">
            View pipeline runs
          </Button>
        </Group>
        {syncAchievements.data?.status === 200 && (
          <Text size="sm" c="dimmed" mt="sm">
            Last recalculation: {syncAchievements.data.data.inserted} added,{' '}
            {syncAchievements.data.data.updated} updated,{' '}
            {syncAchievements.data.data.deleted} removed
          </Text>
        )}
        {announceNext.data?.status === 200 && announceNext.data.data.playerId === null && (
          <Text size="sm" c="dimmed" mt="sm">
            Nothing was waiting to be announced.
          </Text>
        )}
      </Paper>
      {achievements.map((achievement) => (
        <AchievementForm key={achievement.id} achievement={achievement} />
      ))}
    </Stack>
  )
}

function AchievementForm({
  achievement,
}: {
  achievement: GetAchievements200Item
}) {
  const updateAchievement = usePutAchievementsId()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    achievement.image_key
      ? `${import.meta.env.VITE_ASSETS_URL}/${achievement.image_key}-w150.webp`
      : null,
  )

  const form = useForm({
    initialValues: {
      name: achievement.name,
      flavour_text: achievement.flavour_text,
      flavour_source: achievement.flavour_source ?? '',
      image_key: achievement.image_key,
    },
  })

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Title order={5}>{achievement.id}</Title>
        <Group gap="xs">
          <Badge variant="light">{achievement.award_count} awarded</Badge>
          {achievement.unannounced_count > 0 && (
            <Badge variant="light" color="orange">
              {achievement.unannounced_count} awaiting announcement
            </Badge>
          )}
        </Group>
      </Group>
      <form
        onSubmit={form.onSubmit(async (values) => {
          let image_key = values.image_key
          if (imageFile) {
            try {
              image_key = await uploadTeamImage(imageFile, 'achievement')
              setImageFile(null)
              form.setFieldValue('image_key', image_key)
            } catch {
              return
            }
          }
          updateAchievement.mutate({
            id: achievement.id,
            data: {
              name: values.name,
              flavour_text: values.flavour_text,
              flavour_source: values.flavour_source.trim() || null,
              image_key,
            },
          })
        })}
      >
        <Grid>
          <Grid.Col span={{ base: 12, xs: 8 }}>
            <Stack gap="xs">
              <TextInput label="Name" required {...form.getInputProps('name')} />
              <Textarea
                label="Flavour text"
                required
                autosize
                minRows={2}
                {...form.getInputProps('flavour_text')}
              />
              <TextInput
                label="Flavour source"
                description="Optional, e.g. who said the quote"
                {...form.getInputProps('flavour_source')}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, xs: 4 }}>
            <ImageUploader
              label="Image"
              value={form.values.image_key}
              preview={imagePreview}
              onChange={(file) => {
                setImageFile(file)
                setImagePreview(URL.createObjectURL(file))
              }}
            />
            {!form.values.image_key && !imageFile && (
              <Text size="xs" c="dimmed" mt={4}>
                No image yet
              </Text>
            )}
          </Grid.Col>
        </Grid>
        <Box mt="sm">
          <Button type="submit" loading={updateAchievement.isPending}>
            Save
          </Button>
        </Box>
      </form>
    </Paper>
  )
}
