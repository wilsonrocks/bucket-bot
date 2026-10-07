import { Table } from '@mantine/core'
import { SortableTh, useTableSort } from '@/components/sortable-table'

export const EventEditPlayerList = ({
  players,
}: {
  players: {
    playerId: number
    playerName: string
    place: number
    points: number
    factionName: string
  }[]
}) => {
  const { rows, getSortProps } = useTableSort(players, {
    name: { value: (p) => p.playerName },
    faction: { value: (p) => p.factionName },
    place: { value: (p) => p.place },
    points: { value: (p) => p.points, natural: 'desc' },
  }, { param: 'playersSort' })
  return (
    <div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <SortableTh {...getSortProps('name')}>Name</SortableTh>
            <SortableTh {...getSortProps('faction')}>Faction</SortableTh>
            <SortableTh {...getSortProps('place')}>Place</SortableTh>
            <SortableTh {...getSortProps('points')}>Points</SortableTh>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((player) => (
            <Table.Tr key={`${player.place}-${player.playerId}`}>
              <Table.Td>{player.playerName}</Table.Td>
              <Table.Td>{player.factionName}</Table.Td>
              <Table.Td>{player.place}</Table.Td>
              <Table.Td>{player.points.toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
