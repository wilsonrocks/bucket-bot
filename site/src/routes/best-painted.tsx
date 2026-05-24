import { fetchAllPainting } from '@/queries'
import { Box, Image, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { Link } from '@/components/link'
import { PaintingLightbox, positionLabel } from '@/components/painting-lightbox'

type PaintingItem = {
  id: number
  playerId: number | null
  playerName: string
  tourneyId: number
  tourneyName: string
  tourneyDate: string
  categoryId: number
  categoryName: string
  imageKey: string | null
  model: string | null
  description: string | null
  position: number
  totalWinners: number
}

function WinnerCard({ winner, onClick }: { winner: PaintingItem; onClick: () => void }) {
  return (
    <Paper
      radius="sm"
      style={{ display: 'grid', gridTemplateRows: 'subgrid', gridRow: 'span 2', cursor: winner.imageKey ? 'pointer' : 'default' }}
      onClick={winner.imageKey ? onClick : undefined}
    >
      <Box style={{ display: 'flex', alignItems: 'flex-end' }}>
        {winner.imageKey && (
          <Image
            src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w150.png`}
            alt={winner.playerName}
            style={{ borderRadius: 'var(--mantine-radius-sm) var(--mantine-radius-sm) 0 0' }}
          />
        )}
      </Box>
      <Stack gap={2} p="sm" pt="xs">
        <Text fw={600} size="sm" lineClamp={1}>
          {winner.playerId != null ? (
            <span onClick={(e) => e.stopPropagation()}>
              <Link to="/player/$id" params={{ id: winner.playerId }} search={{ tab: 'painting', typeCode: undefined, painting: undefined }}>
                {winner.playerName}
              </Link>
            </span>
          ) : winner.playerName}
        </Text>
        {(winner.model || winner.description) && (
          <Text size="xs" c="dimmed" lineClamp={1}>{winner.model ?? winner.description}</Text>
        )}
        <Text size="xs" c="dimmed" lineClamp={1}>
          <span onClick={(e) => e.stopPropagation()}>
            <Link to="/event/$id" params={{ id: winner.tourneyId }} search={{ tab: 'best-painted', painting: undefined }}>
              {winner.tourneyName}
            </Link>
          </span>
        </Text>
        <Text size="xs" c="dimmed">{winner.categoryName} — {positionLabel(winner.position, winner.totalWinners)}</Text>
      </Stack>
    </Paper>
  )
}

export const Route = createFileRoute('/best-painted')({
  validateSearch: z.object({ painting: z.coerce.number().optional() }),
  staticData: { title: 'Best Painted' },
  loader: () => fetchAllPainting(),
  component: RouteComponent,
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const { painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()

  const activeWinner = activePaintingId ? (data.find((w) => w.id === activePaintingId) ?? null) : null
  const lightboxWinner = activeWinner ? {
    id: activeWinner.id,
    imageKey: activeWinner.imageKey,
    playerName: activeWinner.playerName,
    playerId: activeWinner.playerId,
    model: activeWinner.model,
    description: activeWinner.description,
    categoryName: activeWinner.categoryName,
    position: activeWinner.position,
    totalWinners: activeWinner.totalWinners,
  } : null

  return (
    <div>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
        {data.map((winner) => (
          <WinnerCard
            key={winner.id}
            winner={winner}
            onClick={() => navigate({ search: (prev) => ({ ...prev, painting: winner.id }) })}
          />
        ))}
      </SimpleGrid>
      <PaintingLightbox
        winner={lightboxWinner}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
        linkPlayerName
      />
    </div>
  )
}
