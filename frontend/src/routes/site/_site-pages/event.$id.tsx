import { Box, Image, SimpleGrid, Table, Tabs, Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { useGetTourneyId } from '@/api/hooks'
import type { GetTourneyId200PlayersItem } from '@/api/generated/bucketBotAPI.schemas'
import { Link } from '@/components/link'
import { PaintingLightbox, positionLabel } from '@/components/painting-lightbox'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'

const eventParamsValidator = z.object({ id: z.coerce.number() })

export const Route = createFileRoute('/site/_site-pages/event/$id')({
  component: RouteComponent,
  params: eventParamsValidator,
  validateSearch: z.object({
    tab: z.enum(['results', 'best-painted']).optional(),
    painting: z.coerce.number().optional(),
  }),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { tab, painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const tourneyDetail = useGetTourneyId(String(id))

  if (!tourneyDetail.data) {
    return <div>Loading...</div>
  }

  const paintingCategories = (tourneyDetail.data.paintingCategories as any[]) ?? []
  const hasAnyImages = paintingCategories.some((cat: any) =>
    (cat.winners ?? []).some((w: any) => w.imageKey)
  )

  const activeWinner = activePaintingId
    ? paintingCategories
        .flatMap((cat: any) =>
          (cat.winners ?? []).map((w: any) => ({
            ...w,
            categoryName: cat.name,
            totalWinners: cat.winners.length,
          }))
        )
        .find((w: any) => w.id === activePaintingId) ?? null
    : null

  const activeTab = tab ?? 'results'

  return (
    <div>
      <Title order={1} mb="md">
        {(tourneyDetail.data.tourney as { name: string }).name}
      </Title>

      <Tabs
        value={activeTab}
        onChange={(value) =>
          navigate({ search: (prev) => ({ ...prev, tab: value as 'results' | 'best-painted' | undefined }) })
        }
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="results">Results</Tabs.Tab>
          {hasAnyImages && <Tabs.Tab value="best-painted">Best Painted</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="results">
          <Table
            tabularNums
            data={{
              head: ['Place', 'Name', 'Points', 'Faction'],
              body: (tourneyDetail.data.players as GetTourneyId200PlayersItem[]).map((row) => [
                row.place,
                row.playerId != null
                  ? <Link to={PlayerRoute.to} params={{ id: row.playerId }} search={{ tab: undefined }}>{row.playerName}</Link>
                  : row.playerName,
                row.points.toFixed(2),
                row.factionName,
              ]),
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="best-painted">
          {paintingCategories.map((cat: any) => {
            const winnersWithImages = (cat.winners ?? []).filter((w: any) => w.imageKey)
            if (winnersWithImages.length === 0) return null
            return (
              <Box key={cat.id} mb="lg">
                <Title order={3} mb="sm">{cat.name}</Title>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {winnersWithImages.map((winner: any) => (
                    <Box
                      key={winner.id}
                      w={150}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate({ search: (prev) => ({ ...prev, painting: winner.id }) })}
                    >
                      <Image
                        src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w150.png`}
                        alt={`${winner.playerName} — ${cat.name}`}
                        radius="sm"
                        w={150}
                      />
                      <Text size="xs" c="dimmed" mt={4} ta="center">
                        {positionLabel(winner.position, cat.winners.length)} —{' '}
                        {winner.playerId != null ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Link
                              to={PlayerRoute.to}
                              params={{ id: winner.playerId }}
                              search={{ tab: 'painting' }}
                              target="painting"
                            >
                              {winner.playerName}
                            </Link>
                          </span>
                        ) : (
                          winner.playerName
                        )}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )
          })}
        </Tabs.Panel>
      </Tabs>

      <PaintingLightbox
        winner={activeWinner}
        onClose={() => navigate({ search: (prev) => ({ ...prev, painting: undefined }) })}
        linkPlayerName
      />
    </div>
  )
}
