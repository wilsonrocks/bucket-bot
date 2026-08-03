import { usePostBotEventId, useGetTiers } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Button, Loader, Select, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { Route as EventIdRoute } from '../events.$id.edit.tsx'

export const Route = createFileRoute('/_app/import/import-bot')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: { title: 'Import BOT4 Event' },
})

function extractBotId(input: string): string | null {
  // Accepts the event page URL (/events/<id>) and the API URL (/api/event/<id>)
  const urlMatch = input.match(
    /bag-o-tools\.web\.app\/(?:api\/event|events?)\/([A-Za-z0-9_-]+)/,
  )
  if (urlMatch) return urlMatch[1]
  if (/^[A-Za-z0-9_-]+$/.test(input.trim())) return input.trim()
  return null
}

function RouteComponent() {
  const tiers = useGetTiers()
  const form = useForm({
    initialValues: { botIdOrUrl: '', tierCode: 'EVENT' },
    validate: {
      botIdOrUrl: (value) => {
        if (!extractBotId(value)) {
          return 'Please enter a valid BOT4 event ID or URL'
        }
        return null
      },
    },
    transformValues: (values) => ({
      id: extractBotId(values.botIdOrUrl) ?? '',
      tierCode: values.tierCode,
    }),
  })
  const navigateToEventPage = EventIdRoute.useNavigate()
  const newBotEventMutation = usePostBotEventId()

  return (
    <div>
      <form
        onSubmit={form.onSubmit((values) => {
          newBotEventMutation.mutate(
            { id: values.id, data: { tierCode: values.tierCode } },
            {
              onSuccess: (response) => {
                navigateToEventPage({ params: { id: (response.data as { id: number }).id }, search: { tab: undefined } })
              },
              onError: (error) => {
                console.error(error)
              },
            },
          )
        })}
      >
        <TextInput
          mb="md"
          label="BOT4 Event ID or URL"
          placeholder="Enter BOT4 event ID or URL"
          {...form.getInputProps('botIdOrUrl')}
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
        <Button type="submit" disabled={newBotEventMutation.isPending}>
          Create event
        </Button>

        {newBotEventMutation.isPending && <Loader />}

      </form>
    </div>
  )
}
