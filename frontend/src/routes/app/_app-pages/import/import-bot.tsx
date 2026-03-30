import { usePostBotEventId } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Button, Loader, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { Route as EventIdRoute } from '../events.$id.edit.tsx'

export const Route = createFileRoute('/app/_app-pages/import/import-bot')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
  staticData: { title: 'Import BOT Event' },
})

function extractBotId(input: string): string | null {
  const urlMatch = input.match(/bag-o-tools\.web\.app\/event\/([A-Za-z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  if (/^[A-Za-z0-9]+$/.test(input.trim())) return input.trim()
  return null
}

function RouteComponent() {
  const form = useForm({
    initialValues: { botIdOrUrl: '' },
    validate: {
      botIdOrUrl: (value) => {
        if (!extractBotId(value)) {
          return 'Please enter a valid BOT event ID or URL'
        }
        return null
      },
    },
    transformValues: (values) => ({
      id: extractBotId(values.botIdOrUrl) ?? '',
    }),
  })
  const navigateToEventPage = EventIdRoute.useNavigate()
  const newBotEventMutation = usePostBotEventId()

  return (
    <div>
      <form
        onSubmit={form.onSubmit((values) => {
          newBotEventMutation.mutate({ id: values.id }, {
            onSuccess: (response) => {
              navigateToEventPage({ params: { id: (response.data as { id: number }).id }, search: { tab: undefined } })
            },
            onError: (error) => {
              console.error(error)
            },
          })
        })}
      >
        <TextInput
          mb="md"
          label="BOT Event ID or URL"
          placeholder="Enter BOT event ID or URL"
          {...form.getInputProps('botIdOrUrl')}
        />
        <Button type="submit" disabled={newBotEventMutation.isPending}>
          Create event
        </Button>

        {newBotEventMutation.isPending && <Loader />}

      </form>
    </div>
  )
}
