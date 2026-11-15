import {
  useGetAllDiscordUsers,
  useGetUpcomingEvents,
  useGetVenues,
  usePostSyncUpcomingEvents,
  usePutUpcomingEventOrganisers,
  usePutUpcomingEventVenue,
} from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { SortableTh, useTableSort } from '@/components/sortable-table'
import { usePermissions } from '@/hooks/usePermissions'
import { Button, Group, MultiSelect, Select, Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/_app/events/upcoming')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Upcoming Events' },
})

function RouteComponent() {
  const { rankingReporter } = usePermissions()
  const { data: events } = useGetUpcomingEvents()
  const { data: venues } = useGetVenues()
  const { data: discordUsers } = useGetAllDiscordUsers()
  const setVenue = usePutUpcomingEventVenue()
  const setOrganisers = usePutUpcomingEventOrganisers()
  const syncEvents = usePostSyncUpcomingEvents()

  const venueOptions = (venues ?? []).map((v) => ({
    value: String(v.id),
    label: `${v.name} - ${v.town}`,
  }))

  const organiserOptions = (discordUsers ?? []).map((user) => ({
    value: String(user.discord_user_id),
    label: (user.name ||
      user.discord_display_name ||
      user.discord_username ||
      user.discord_user_id) as string,
  }))

  const { rows, getSortProps } = useTableSort(events ?? [], {
    event: { value: (e) => e.name },
    date: { value: (e) => e.starts_at },
    location: { value: (e) => e.location },
  })

  if (!events) return <div>Loading...</div>

  return (
    <>
      {rankingReporter && (
        <Group justify="flex-end" mb="md">
          <Text>
            This pulls from the calendar automatically each day at 8am
          </Text>
          <Button
            onClick={() => syncEvents.mutate(undefined)}
            loading={syncEvents.isPending}
          >
            Pull now
          </Button>
        </Group>
      )}
      <Table>
        <Table.Thead>
          <Table.Tr>
            <SortableTh {...getSortProps('event')}>Event</SortableTh>
            <SortableTh {...getSortProps('date')}>Date</SortableTh>
            <SortableTh {...getSortProps('location')}>Location</SortableTh>
            <Table.Th>Organisers</Table.Th>
            <Table.Th>Venue</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((event) => {
            return (
              <Table.Tr key={event.id}>
                <Table.Td>{event.name}</Table.Td>
                <Table.Td>
                  {format(parseISO(event.starts_at), 'dd MMM yyyy')}
                </Table.Td>
                <Table.Td>{event.location ?? '—'}</Table.Td>
                <Table.Td>
                  <MultiSelect
                    placeholder={
                      event.organiser_discord_ids.length ? undefined : 'No organisers'
                    }
                    data={organiserOptions}
                    searchable
                    clearable
                    disabled={!rankingReporter}
                    value={event.organiser_discord_ids}
                    onChange={(value) =>
                      setOrganisers.mutate({
                        id: String(event.id),
                        data: { organiser_discord_ids: value },
                      })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    placeholder="No venue"
                    data={venueOptions}
                    searchable
                    clearable
                    disabled={!rankingReporter}
                    value={
                      event.venue_id != null ? String(event.venue_id) : null
                    }
                    onChange={(value) =>
                      setVenue.mutate({
                        id: String(event.id),
                        data: {
                          venue_id: value != null ? Number(value) : null,
                        },
                      })
                    }
                  />
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </>
  )
}
