import { DiscordLookup } from '@/components/discord-lookup'
import { useGetPlayersWithNoDiscordId } from '@/hooks/useApi'
import { Pagination, Stack, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

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
  const pageSize = 5
  const [page, setPage] = useState(1)

  return (
    <div>
      {unmappedPlayers.isLoading && <div>Loading...</div>}
      {unmappedPlayers.isError && <div>Error loading unmapped players.</div>}
      {unmappedPlayers.data && (
        <>
          <div>{unmappedPlayers.data.length} still to map!</div>
          <Pagination
            total={unmappedPlayers.data.length / pageSize}
            value={page}
            onChange={setPage}
          />

          <Table
            data={{
              head: ['Our Name', 'Longshanks ID', 'Event Results', 'Map to?'],
              body: unmappedPlayers.data
                .slice((page - 1) * pageSize, page * pageSize)
                .map(({ player_id, player_name, longshanks_id, results }) => [
                  player_name,
                  longshanks_id,
                  <Stack gap="xs" style={{ maxWidth: '200px' }}>
                    {results.map(({ tourney_name, place, faction }, index) => (
                      <div key={index}>
                        <b>{toOrdinal(place)}</b> place at{' '}
                        <em>{tourney_name}</em> playing <b>{faction}</b>
                      </div>
                    ))}
                  </Stack>,
                  <DiscordLookup
                    playerId={player_id}
                    playerName={player_name}
                    initialText={player_name}
                  />,
                ]),
            }}
          />
        </>
      )}
    </div>
  )
}
