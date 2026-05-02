import { Box, Image, Modal, Text } from '@mantine/core'
import { Link } from '@/components/link'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'

export type PaintingLightboxWinner = {
  id: number
  imageKey: string | null
  playerName: string
  playerId: number | null
  model: string | null
  description: string | null
  categoryName: string
  position: number
  totalWinners: number
}

export function positionLabel(position: number, total: number): string {
  if (total === 1) return 'Winner'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${position}${suffixes[position] ?? 'th'}`
}

export function PaintingLightbox({
  winner,
  onClose,
  linkPlayerName = false,
}: {
  winner: PaintingLightboxWinner | null
  onClose: () => void
  linkPlayerName?: boolean
}) {
  return (
    <Modal
      opened={!!winner}
      onClose={onClose}
      size="xl"
      centered
      title={
        winner
          ? `${winner.categoryName} — ${positionLabel(winner.position, winner.totalWinners)}`
          : ''
      }
    >
      {winner && (
        <Box>
          {winner.imageKey && (
            <Image
              src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w800.png`}
              alt={winner.playerName}
              radius="sm"
              fit="contain"
              mah={500}
              mb="md"
            />
          )}
          {linkPlayerName && winner.playerId != null ? (
            <Link
              to={PlayerRoute.to}
              params={{ id: winner.playerId }}
              search={{ tab: 'painting' }}
              target="painting"
              fw={600}
            >
              {winner.playerName}
            </Link>
          ) : (
            <Text fw={600}>{winner.playerName}</Text>
          )}
          {winner.model && (
            <Text size="sm" c="dimmed">
              {winner.model}
            </Text>
          )}
          {winner.description && (
            <Text size="sm" mt="xs">
              {winner.description}
            </Text>
          )}
        </Box>
      )}
    </Modal>
  )
}
