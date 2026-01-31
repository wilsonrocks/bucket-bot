import { useGetUnmappedIdentities } from '@/hooks/useApi'
import { createFileRoute } from '@tanstack/react-router'
import { Box, List, Pagination, Stack, Table, Text } from '@mantine/core'
import { useState } from 'react'
import { toOrdinal } from '@/helpers/to-ordinal'

export const Route = createFileRoute('/app/identities')({
  component: RouteComponent,
  staticData: { title: 'Identities' },
})

function RouteComponent() {
  const unmappedIdentities = useGetUnmappedIdentities()

  const [currentPage, setCurrentPage] = useState<number>(1)

  if (!unmappedIdentities.data) {
    return <div>Loading...</div>
  }

  if (unmappedIdentities.data.length === 0) {
    return <div>All identities are mapped!</div>
  }

  const currentIdentity = unmappedIdentities.data[currentPage - 1]

  return (
    <div>
      <Pagination
        total={unmappedIdentities.data.length || 0}
        value={currentPage}
        onChange={setCurrentPage}
      />
      <Table
        data={{
          head: ['Provider', 'Name', 'Results'],
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
            ],
          ],
        }}
      />
    </div>
  )
}
