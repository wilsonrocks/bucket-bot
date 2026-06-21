import {
  useGetAllDiscordUsers,
  useGetUpcomingEvents,
  useGetVenues,
  usePostSyncUpcomingEvents,
  usePutUpcomingEventOrganiser,
  usePutUpcomingEventVenue,
} from '@/api/hooks'
import { RequireEventAccess } from '@/components/RequireEventAccess'
import { usePermissions } from '@/hooks/usePermissions'
import { Button, Group, Select, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/_app/events/upcoming')({
  component: () => (
    <RequireEventAccess>
      <RouteComponent />
    </RequireEventAccess>
  ),
  staticData: { title: 'Upcoming Events' },
})

function RouteComponent() {
  const { rankingReporter, isEventOrganiser } = usePermissions()
  const { data: events } = useGetUpcomingEvents()
  const { data: venues } = useGetVenues()
  const { data: discordUsers } = useGetAllDiscordUsers()
  const setVenue = usePutUpcomingEventVenue()
  const setOrganiser = usePutUpcomingEventOrganiser()
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

  if (!events) return <div>Loading...</div>

  return (
    <>
      {rankingReporter && (
        <Group justify="flex-end" mb="md">
          <Button
            onClick={() => syncEvents.mutate(undefined)}
            loading={syncEvents.isPending}
          >
            Sync now
          </Button>
        </Group>
      )}
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Event</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Location</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Organiser</Table.Th>
            <Table.Th>Venue</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {events.map((event) => {
            const canEditVenue = rankingReporter || isEventOrganiser(event.id)
            return (
              <Table.Tr key={event.id}>
                <Table.Td>{event.name}</Table.Td>
                <Table.Td>
                  {format(parseISO(event.starts_at), 'dd MMM yyyy')}
                </Table.Td>
                <Table.Td>{event.location ?? '—'}</Table.Td>
                <Table.Td>{event.description ?? '—'}</Table.Td>
                <Table.Td>
                  <Select
                    placeholder="No organiser"
                    data={organiserOptions}
                    searchable
                    clearable
                    disabled={!rankingReporter}
                    value={event.organiser_discord_id ?? null}
                    onChange={(value) =>
                      setOrganiser.mutate({
                        id: String(event.id),
                        data: { organiser_discord_id: value },
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
                    disabled={!canEditVenue}
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
