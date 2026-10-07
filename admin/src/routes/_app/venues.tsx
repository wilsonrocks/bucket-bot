import { useGetVenues, usePostCreateVenue, usePostVenueGeocode } from '@/api/hooks'
import { SortableTh, useTableSort } from '@/components/sortable-table'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Box, Button, Grid, Paper, Table, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/venues')({
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
  const { rows, getSortProps } = useTableSort(venuesData ?? [], {
    name: { value: (v) => v.name },
    town: { value: (v) => v.town },
    postCode: { value: (v) => v.post_code },
    region: { value: (v) => v.region_name },
    lat: { value: (v) => v.latitude },
    long: { value: (v) => v.longitude },
  })

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
              <SortableTh {...getSortProps('name')}>Venue Name</SortableTh>
              <SortableTh {...getSortProps('town')}>Town</SortableTh>
              <SortableTh {...getSortProps('postCode')}>Post Code</SortableTh>
              <SortableTh {...getSortProps('region')}>Region</SortableTh>
              <SortableTh {...getSortProps('lat')}>Lat</SortableTh>
              <SortableTh {...getSortProps('long')}>Long</SortableTh>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((venue) => (
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
