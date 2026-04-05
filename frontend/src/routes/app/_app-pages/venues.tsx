import { useGetVenues, usePostCreateVenue, usePostVenueGeocode } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Box, Button, Grid, Paper, Table, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/_app-pages/venues')({
  component: () => <RequireRankingReporter><RouteComponent /></RequireRankingReporter>,
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
  const createVenueMutation = usePostCreateVenue()
  const geocodeMutation = usePostVenueGeocode()
  const [pendingGeocodeIds, setPendingGeocodeIds] = useState(new Set<number>())

  return (
    <div>
      <Paper withBorder p="md">
        <form
          onSubmit={form.onSubmit((values) => {
            createVenueMutation.mutate(
              {
                data: {
                  name: values.name,
                  town: values.town,
                  postCode: values.postCode,
                },
              },
              {
                onSuccess: () => {
                  form.reset()
                },
              },
            )
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
          </Grid>
          <Box>
            <Button type="submit">Create Venue</Button>
          </Box>
        </form>
      </Paper>
      {venuesData && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Venue Name</Table.Th>
              <Table.Th>Town</Table.Th>
              <Table.Th>Post Code</Table.Th>
              <Table.Th>Region</Table.Th>
              <Table.Th>Lat</Table.Th>
              <Table.Th>Long</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {venuesData.map((venue) => (
              <Table.Tr key={venue.id}>
                <Table.Td>{venue.name}</Table.Td>
                <Table.Td>{venue.town}</Table.Td>
                <Table.Td>{venue.post_code}</Table.Td>
                <Table.Td>{venue.region_name ?? '—'}</Table.Td>
                <Table.Td>{venue.latitude != null ? venue.latitude.toFixed(4) : '—'}</Table.Td>
                <Table.Td>{venue.longitude != null ? venue.longitude.toFixed(4) : '—'}</Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    size="xs"
                    disabled={pendingGeocodeIds.has(venue.id)}
                    onClick={() => {
                      setPendingGeocodeIds((prev) => new Set(prev).add(venue.id))
                      geocodeMutation.mutate(venue.id, {
                        onSettled: () =>
                          setPendingGeocodeIds((prev) => {
                            const next = new Set(prev)
                            next.delete(venue.id)
                            return next
                          }),
                      })
                    }}
                  >
                    Refresh location
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}
