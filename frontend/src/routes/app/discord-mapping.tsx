import { useGetPlayersWithNoDiscordId } from '@/hooks/useApi'
import { Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

function toOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const Route = createFileRoute('/app/discord-mapping')({
  component: RouteComponent,
  staticData: {
    title: 'Discord Mapping',
  },
})

function RouteComponent() {
  const unmappedPlayers = useGetPlayersWithNoDiscordId()

  return (
    <div>
      {unmappedPlayers.isLoading && <div>Loading...</div>}
      {unmappedPlayers.isError && <div>Error loading unmapped players.</div>}
      {unmappedPlayers.data && (
        <Table
          data={{
            head: [
              'Our Name',
              'Longshanks Name',
              'Longshanks ID',
              'Event Results',
            ],
            body: unmappedPlayers.data.map(
              ({ player_name, longshanks_name, longshanks_id, results }) => [
                player_name,
                longshanks_name,
                longshanks_id,
                <div>
                  {results.map(({ tourney_name, place, faction }, index) => (
                    <div key={index}>
                      <b>{toOrdinal(place)}</b> place at <em>{tourney_name}</em>{' '}
                      playing <b>{faction}</b>
                    </div>
                  ))}
                </div>,
              ],
            ),
          }}
        />
      )}
    </div>
  )
}
