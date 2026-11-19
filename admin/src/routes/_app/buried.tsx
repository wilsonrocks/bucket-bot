import {
  uploadTeamImage,
  useGetBuriedYears,
  usePostBuriedYearsYearDmAll,
  usePostBuriedYearsYearDmTest,
  usePostBuriedYearsYearGenerate,
  usePutBuriedYearsYear,
} from '@/api/hooks'
import type { GetBuriedYears200Item } from '@/api/generated/bucketBotAPI.schemas'
import { ImageUploader } from '@/components/ImageUploader'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { SITE_URL } from '@/helpers/site-url'
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { modals } from '@mantine/modals'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/buried')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Malifaux Buried' },
})

function RouteComponent() {
  const { data: years } = useGetBuriedYears()
  if (!years) return <div>Loading...</div>

  return (
    <Stack>
      <Text>
        Malifaux Buried is each player's year in review: a deck of cards built
        from their results, painting awards, events organised and rankings.
        Generate the decks after the cutoff, check a few on the site, publish,
        then DM everyone their link.
      </Text>
      {years.map((year) => (
        <BuriedYearPanel key={year.year} year={year} />
      ))}
    </Stack>
  )
}

function BuriedYearPanel({ year }: { year: GetBuriedYears200Item }) {
  const update = usePutBuriedYearsYear()
  const generate = usePostBuriedYearsYearGenerate()
  const dmTest = usePostBuriedYearsYearDmTest()
  const dmAll = usePostBuriedYearsYearDmAll()
  const [uploading, setUploading] = useState(false)
  const [cutoff, setCutoff] = useState<string | null>(year.cutoff_date)

  const yearParam = String(year.year)
  const running = year.generation.state === 'running'
  const published = year.published_at !== null

  const uploadCardBack = async (file: File) => {
    setUploading(true)
    try {
      const key = await uploadTeamImage(file, 'buried')
      await update.mutateAsync({
        year: yearParam,
        data: { card_back_image_key: key },
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Paper withBorder p="md">
      <Stack>
        <Group justify="space-between">
          <Title order={3}>Buried {year.year}</Title>
          <Group gap="xs">
            {!year.has_generator && <Badge color="red">No generator</Badge>}
            <Badge color={published ? 'green' : 'gray'}>
              {published ? 'Published' : 'Not published'}
            </Badge>
          </Group>
        </Group>

        <Group align="flex-start" gap="xl">
          <div style={{ width: 200 }}>
            <ImageUploader
              label="Card back logo"
              value={year.card_back_image_key}
              onChange={uploadCardBack}
              loading={uploading}
              enableCrop={false}
            />
            <Text size="xs" c="dimmed" mt={4}>
              Shown face-down before the first flip, and in the corner of every
              share image. Regenerate after changing it.
            </Text>
          </div>

          <Stack gap="xs" style={{ flex: 1 }}>
            <Group align="flex-end">
              <DatePickerInput
                label="Cutoff (exclusive)"
                description="Events from 1 Jan up to, not including, this date"
                value={cutoff}
                onChange={setCutoff}
                valueFormat="D MMMM YYYY"
                minDate={`${year.year}-01-02`}
                maxDate={`${year.year + 1}-01-01`}
                defaultDate={cutoff ?? `${year.year}-12-01`}
                w={300}
              />
              <Button
                variant="default"
                disabled={!cutoff || cutoff === year.cutoff_date}
                loading={update.isPending}
                onClick={() =>
                  cutoff &&
                  update.mutate({ year: yearParam, data: { cutoff_date: cutoff } })
                }
              >
                Save cutoff
              </Button>
            </Group>

            <Text>
              <strong>{year.player_count}</strong> decks
              {year.last_generated_at &&
                `, last generated ${new Date(year.last_generated_at).toLocaleString()}`}
              . <strong>{year.dm_sent_count}</strong> DMed,{' '}
              <strong>{year.dm_pending_count}</strong> waiting (players with a
              linked Discord account).
            </Text>

            <GenerationStatus year={year} />

            <Group>
              <Button
                disabled={!year.has_generator}
                loading={running || generate.isPending}
                onClick={() => generate.mutate({ year: yearParam })}
              >
                {year.player_count > 0 ? 'Regenerate' : 'Generate'}
              </Button>
              <Switch
                label="Published"
                checked={published}
                disabled={update.isPending}
                onChange={(e) =>
                  update.mutate({
                    year: yearParam,
                    data: { published: e.currentTarget.checked },
                  })
                }
              />
            </Group>

            <Group>
              <Button
                variant="default"
                loading={dmTest.isPending}
                onClick={() => dmTest.mutate({ year: yearParam })}
              >
                Send test DM to me
              </Button>
              <Button
                color="red"
                disabled={!published || year.dm_pending_count === 0}
                loading={dmAll.isPending}
                onClick={() =>
                  modals.openConfirmModal({
                    title: `DM everyone their Buried ${year.year}`,
                    children: (
                      <Text>
                        This DMs {year.dm_pending_count} player
                        {year.dm_pending_count === 1 ? '' : 's'} their link.
                        Anyone already DMed is skipped, so it's safe to re-run
                        after failures. Only works in prod.
                      </Text>
                    ),
                    labels: { confirm: 'Send DMs', cancel: 'Cancel' },
                    confirmProps: { color: 'red' },
                    onConfirm: () => dmAll.mutate({ year: yearParam }),
                  })
                }
              >
                DM everyone
              </Button>
            </Group>
            {dmAll.data?.status === 200 && (
              <Text size="sm">
                Sent {dmAll.data.data.sent}, failed {dmAll.data.data.failed},
                skipped {dmAll.data.data.skipped} (no Discord link).
              </Text>
            )}

            <Text size="sm" c="dimmed">
              Decks live at{' '}
              <Anchor href={`${SITE_URL}/player/1/buried/${year.year}`} target="_blank">
                /player/:id/buried/{year.year}
              </Anchor>{' '}
              and 404 until published.
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Paper>
  )
}

function GenerationStatus({ year }: { year: GetBuriedYears200Item }) {
  const g = year.generation
  if (g.state === 'running')
    return (
      <Alert color="blue">
        Generating since {new Date(g.startedAt!).toLocaleTimeString()} — this
        renders ~10 images per player and takes a few minutes.
      </Alert>
    )
  if (g.state === 'failed')
    return <Alert color="red">Generation failed: {g.error}</Alert>
  if (g.state === 'done' && g.result)
    return (
      <Alert color="green">
        Generated {g.result.players} decks ({g.result.cards} cards)
        {g.result.removed > 0 && `, removed ${g.result.removed}`}.
      </Alert>
    )
  return null
}
