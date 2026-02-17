import { useCreateLongshanksEventMutation } from '@/hooks/useApi.ts'
import { Button, Loader, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { Route as EventIdRoute } from '../events.$id.edit.tsx'

export const Route = createFileRoute(
  '/app/_app-pages/import/import-longshanks',
)({
  component: RouteComponent,
  staticData: { title: 'Import Longshanks Event' },
})

function RouteComponent() {
  const form = useForm({
    initialValues: { longshanksIdOrUrl: '' },
    validate: {
      longshanksIdOrUrl: (value) => {
        const match = value.match(/([0-9]+)/)
        if (!match) {
          return 'Please enter a valid Longshanks ID or URL'
        }
        return null
      },
    },
    transformValues: (values) => ({
      longshanksId: Number(
        values.longshanksIdOrUrl.match(/([0-9]+)/)?.[1] ?? NaN,
      ),
    }),
  })
  const navigateToEventPage = EventIdRoute.useNavigate()
  const newLongshanksEventMutation = useCreateLongshanksEventMutation()

  return (
    <div>
      <form
        onSubmit={form.onSubmit((values) => {
          newLongshanksEventMutation.mutate(values.longshanksId, {
            onSuccess: (response) => {
              navigateToEventPage({ params: { id: response.id } })
            },
            onError: (error) => {
              console.error(error)
            },
          })
        })}
      >
        <TextInput
          mb="md"
          label="Longshanks ID or URL"
          placeholder="Enter Longshanks ID or URL"
          {...form.getInputProps('longshanksIdOrUrl')}
        />
        <Button type="submit" disabled={newLongshanksEventMutation.isPending}>
          Create event
        </Button>

        {newLongshanksEventMutation.isPending && <Loader />}
      </form>
    </div>
  )
}
