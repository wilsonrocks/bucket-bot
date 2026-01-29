import { Table } from '@mantine/core'

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
  return (
    <div>
      <Table
        data={{
          head: ['Name', 'Faction', 'Place', 'Points'],
          body: players.map((player) => [
            player.playerName,
            player.factionName,
            player.place,
            player.points.toFixed(2),
          ]),
        }}
      />
    </div>
  )
}
