import { Button, Loader, Modal, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Route as EventIdRoute } from '../events.$id.edit.tsx'
import { Route as IndexRoute } from './index.tsx'
import { useCreateLongshanksEventMutation } from '@/hooks/useApi.ts'

export const Route = createFileRoute('/app/_app-pages/events/new-longshanks')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
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
    <Modal
      opened={true}
      onClose={() => {
        navigate({ to: IndexRoute.path, from: '/' })
      }}
    >
      {form.getValues().longshanksIdOrUrl.match(/([0-9]+)/)?.[1]}
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
          label="Longshanks ID or URL"
          placeholder="Enter Longshanks ID or URL"
          {...form.getInputProps('longshanksIdOrUrl')}
        />
        <Button type="submit" disabled={newLongshanksEventMutation.isPending}>
          'Create Event'
        </Button>
        {newLongshanksEventMutation.isPending && <Loader type="bars" />}
      </form>
    </Modal>
  )
}
