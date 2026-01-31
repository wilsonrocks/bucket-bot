import { DiscordLookup } from '@/components/discord-lookup'
import { toOrdinal } from '@/helpers/to-ordinal'
import { useGetUnmappedIdentities } from '@/hooks/useApi'
import { List, Pagination, Table } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/app/identities')({
  component: RouteComponent,
  staticData: { title: 'Identities' },
})

function RouteComponent() {
  const unmappedIdentities = useGetUnmappedIdentities()

  const [currentPage, setCurrentPage] = useState<number>(1)

  const currentIdentity = (unmappedIdentities.data ?? [])[currentPage - 1]

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentIdentity) {
      setCurrentPage(1)
    }
  }, [JSON.stringify(currentIdentity)])

  if (!unmappedIdentities.data) {
    return <div>Loading...</div>
  }

  if (unmappedIdentities.data.length === 0) {
    return <div>All identities are mapped!</div>
  }

  return (
    <div>
      <Pagination
        total={unmappedIdentities.data.length || 0}
        value={currentPage}
        onChange={setCurrentPage}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {currentIdentity && (
        <Table
          layout="fixed"
          styles={{ td: { verticalAlign: 'top' } }}
          data={{
            head: ['Provider', 'Name', 'Results', 'Map to?'],
            body: [
              [
                currentIdentity.provider_name,
                currentIdentity.name,
                <List listStyleType="disc">
                  {currentIdentity.results.map(
                    ({ place, faction, tourney_name }) => (
                      <List.Item key={`${place}-${tourney_name}-${faction}`}>
                        {`${toOrdinal(place)} place at ${tourney_name} with ${faction}`}
                      </List.Item>
                    ),
                  )}
                </List>,
                <DiscordLookup
                  playerIdentityId={currentIdentity.player_identity_id}
                  initialText={currentIdentity.name}
                />,
              ],
            ],
          }}
        />
      )}
    </div>
  )
}
