import { useCreateVenueMutation, useGetVenues } from '@/hooks/useApi'
import { Button, Grid, Paper, Table, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/venues')({
  component: RouteComponent,
  staticData: { title: 'Venues' },
})

function RouteComponent() {
  const form = useForm<{ name: string; town: string; postCode: string }>({
    initialValues: {
      name: '',
      town: '',
      postCode: '',
    },
  })

  const { data: venuesData } = useGetVenues()
  const createVenueMutation = useCreateVenueMutation()

  return (
    <div>
      <Paper withBorder p="md">
        <form
          onSubmit={form.onSubmit((values) => {
            createVenueMutation.mutate({
              name: values.name,
              town: values.town,
              postCode: values.postCode,
            })
          })}
        >
          <Grid>
            <Grid.Col span={{ base: 12, xs: 3 }}>
              <TextInput
                label="Venue Name"
                {...form.getInputProps('name')}
                mb="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 3 }}>
              <TextInput label="Town" {...form.getInputProps('town')} mb="md" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 3 }}>
              <TextInput
                label="Post Code"
                {...form.getInputProps('postCode')}
                mb="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 3 }}>
              <Button type="submit">Create Venue</Button>
            </Grid.Col>
          </Grid>
        </form>
      </Paper>
      {venuesData && (
        <Table
          data={{
            head: ['Venue Name', 'Town', 'Post Code'],
            body: venuesData.map((venue) => [
              venue.name,
              venue.town,
              venue.post_code,
            ]),
          }}
        />
      )}
    </div>
  )
}
