import { usePostLongshanksEventId, useGetTiers } from '@/api/hooks'
import type { PostLongshanksEventId422 } from '@/api/hooks'
import { ApiError } from '@/api/custom-instance'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Alert, Button, Loader, Select, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Route as EventIdRoute } from '../events.$id.edit.tsx'

export const Route = createFileRoute(
  '/_app/import/import-longshanks',
)({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: { title: 'Import Longshanks Event' },
})

function RouteComponent() {
  const tiers = useGetTiers()
  // Set when the backend reports players with no faction on Longshanks; the
  // admin must pick one for each before the import can go through.
  const [missing, setMissing] = useState<PostLongshanksEventId422 | null>(null)
  const form = useForm({
    initialValues: {
      longshanksIdOrUrl: '',
      tierCode: 'EVENT',
      factionOverrides: {} as Record<string, string | null>,
    },
    validate: {
      longshanksIdOrUrl: (value) => {
        const match = value.match(/([0-9]+)/)
        if (!match) {
          return 'Please enter a valid Longshanks ID or URL'
        }
        return null
      },
    },
    onValuesChange: (values, previous) => {
      if (values.longshanksIdOrUrl !== previous.longshanksIdOrUrl && missing) {
        setMissing(null)
        form.setFieldValue('factionOverrides', {})
      }
    },
    transformValues: (values) => ({
      longshanksId: Number(
        values.longshanksIdOrUrl.match(/([0-9]+)/)?.[1] ?? NaN,
      ),
      tierCode: values.tierCode,
      factionOverrides: Object.fromEntries(
        Object.entries(values.factionOverrides).filter(
          (entry): entry is [string, string] => !!entry[1],
        ),
      ),
    }),
  })
  const navigateToEventPage = EventIdRoute.useNavigate()
  const newLongshanksEventMutation = usePostLongshanksEventId()

  const allMissingFilled =
    !missing ||
    missing.missingFactions.every(
      (p) => !!form.values.factionOverrides[p.longshanksId],
    )

  return (
    <div>
      <form
        onSubmit={form.onSubmit((values) => {
          newLongshanksEventMutation.mutate(
            {
              id: String(values.longshanksId),
              data: {
                tierCode: values.tierCode,
                factionOverrides: values.factionOverrides,
              },
            },
            {
              onSuccess: (response) => {
                navigateToEventPage({ params: { id: (response.data as { id: number }).id }, search: { tab: undefined } })
              },
              onError: (error) => {
                if (error instanceof ApiError && error.status === 422) {
                  setMissing(error.body as PostLongshanksEventId422)
                  return
                }
                console.error(error)
              },
            },
          )
        })}
      >
        <TextInput
          mb="md"
          label="Longshanks ID or URL"
          placeholder="Enter Longshanks ID or URL"
          {...form.getInputProps('longshanksIdOrUrl')}
        />
        <Select
          mb="md"
          label="Tier"
          data={(tiers.data ?? []).map((tier) => ({
            value: tier.code,
            label: tier.name,
          }))}
          {...form.getInputProps('tierCode')}
        />

        {missing && (
          <Stack mb="md" gap="sm">
            <Alert color="yellow" title="Missing factions">
              These players have no faction recorded on Longshanks. Choose one
              for each to import the event.
            </Alert>
            {missing.missingFactions.map((player) => (
              <Select
                key={player.longshanksId}
                label={`${player.name} (#${player.longshanksId})`}
                description={
                  player.longshanksFaction
                    ? `Longshanks says "${player.longshanksFaction}", which isn't a known faction`
                    : undefined
                }
                placeholder="Choose faction"
                required
                data={missing.factions.map((f) => ({
                  value: f.code,
                  label: f.name,
                }))}
                value={form.values.factionOverrides[player.longshanksId] ?? null}
                onChange={(code) =>
                  form.setFieldValue('factionOverrides', {
                    ...form.values.factionOverrides,
                    [player.longshanksId]: code,
                  })
                }
              />
            ))}
          </Stack>
        )}

        <Button
          type="submit"
          disabled={newLongshanksEventMutation.isPending || !allMissingFilled}
        >
          Create event
        </Button>

        {newLongshanksEventMutation.isPending && <Loader />}

      </form>
    </div>
  )
}
