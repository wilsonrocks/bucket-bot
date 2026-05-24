import { fetchTourney } from '@/queries'
import { Box, Image, SimpleGrid, Table, Tabs, Text, Title } from '@mantine/core'
import { createFileRoute, notFound } from '@tanstack/react-router'
import z from 'zod'
import { Link } from '@/components/link'
import { PaintingLightbox, positionLabel } from '@/components/painting-lightbox'

export const Route = createFileRoute('/event/$id')({
  params: z.object({ id: z.coerce.number() }),
  validateSearch: z.object({
    tab: z.enum(['results', 'best-painted']).optional(),
    painting: z.coerce.number().optional(),
  }),
  loader: async ({ params }) => {
    try {
      return await fetchTourney({ data: { id: params.id } })
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData }) => loaderData ? ({
    meta: [
      { title: `${(loaderData.tourney as any).name} — b(UK)et bot` },
      { property: 'og:title', content: (loaderData.tourney as any).name },
      { property: 'og:description', content: `Warhammer tournament: ${(loaderData.tourney as any).name}` },
    ],
  }) : {},
  component: RouteComponent,
})

function RouteComponent() {
  const { players, tourney, paintingCategories } = Route.useLoaderData()
  const { tab, painting: activePaintingId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const t = tourney as any
  const cats = (paintingCategories as any[])

  const hasAnyImages = cats.some((cat: any) => (cat.winners ?? []).some((w: any) => w.imageKey))

  const activeWinner = activePaintingId
    ? cats.flatMap((cat: any) => (cat.winners ?? []).map((w: any) => ({ ...w, categoryName: cat.name, totalWinners: cat.winners.length })))
        .find((w: any) => w.id === activePaintingId) ?? null
    : null

  const activeTab = tab ?? 'results'

  return (
    <div>
      <Title order={1} mb="md">{t.name}</Title>
      <Tabs value={activeTab} onChange={(value) => navigate({ search: (prev) => ({ ...prev, tab: value as any }) })}>
        <Tabs.List mb="md">
          <Tabs.Tab value="results">Results</Tabs.Tab>
          {hasAnyImages && <Tabs.Tab value="best-painted">Best Painted</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="results">
          <Table tabularNums data={{
            head: ['Place', 'Name', 'Points', 'Faction'],
            body: (players as any[]).map((row: any) => [
              row.place,
              row.playerId != null
                ? <Link to="/player/$id" params={{ id: row.playerId }} search={{ tab: undefined, typeCode: undefined, painting: undefined }}>{row.playerName}</Link>
                : row.playerName,
              row.points.toFixed(2),
              row.factionName,
            ]),
          }} />
        </Tabs.Panel>

        <Tabs.Panel value="best-painted">
          {cats.map((cat: any) => {
            const winnersWithImages = (cat.winners ?? []).filter((w: any) => w.imageKey)
            if (winnersWithImages.length === 0) return null
            return (
              <Box key={cat.id} mb="lg">
                <Title order={3} mb="sm">{cat.name}</Title>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {winnersWithImages.map((winner: any) => (
                    <Box key={winner.id} w={150} style={{ cursor: 'pointer' }} onClick={() => navigate({ search: (prev) => ({ ...prev, painting: winner.id }) })}>
                      <Image
                        src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w150.png`}
                        alt={`${winner.playerName} — ${cat.name}`}
                        radius="sm" w={150}
                      />
                      <Text size="xs" c="dimmed" mt={4} ta="center">
                        {positionLabel(winner.position, cat.winners.length)} —{' '}
                        {winner.playerId != null ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Link to="/player/$id" params={{ id: winner.playerId }} search={{ tab: 'painting', typeCode: undefined, painting: undefined }}>
                              {winner.playerName}
                            </Link>
                          </span>
                        ) : winner.playerName}
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
