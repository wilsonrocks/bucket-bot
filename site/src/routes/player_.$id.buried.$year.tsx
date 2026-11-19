import { createFileRoute, notFound } from '@tanstack/react-router'
import { useCallback } from 'react'
import { fetchBuried } from '#/queries'
import { optionalString } from '#/helpers/search-params'
import { SITE_NAME, seo } from '#/helpers/seo'
import { Link } from '#/components/link'
import { Deck } from '#/buried/deck'
import { buriedEdition } from '#/buried'

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL

// player_ (trailing underscore) keeps this out of the /player/$id layout.
export const Route = createFileRoute('/player_/$id/buried/$year')({
  params: {
    parse: (raw: Record<string, string>) => ({ id: Number(raw.id), year: Number(raw.year) }),
    stringify: (p: { id: number; year: number }) => ({ id: String(p.id), year: String(p.year) }),
  },
  validateSearch: (search: Record<string, unknown>): { card?: string } => {
    const card = optionalString(search.card)
    return card ? { card } : {}
  },
  // `card` is client state (which card is face-up), not a loader dep.
  loader: async ({ params }) => {
    if (!buriedEdition(params.year)) throw notFound()
    const buried = await fetchBuried({ data: { playerId: params.id, year: params.year } })
    if (!buried) throw notFound()
    return buried
  },
  head: ({ loaderData, params, match }) => {
    if (!loaderData) return {}
    const { playerName, cards, summaryImageKey } = loaderData
    const edition = buriedEdition(params.year)
    const path = `/player/${params.id}/buried/${params.year}`
    const shared = match.search.card ? cards.find((c) => c.key === match.search.card) : undefined

    const sharedImage = shared?.imageKey ? `${ASSETS_URL}/${shared.imageKey}` : undefined
    const summaryImage = summaryImageKey ? `${ASSETS_URL}/${summaryImageKey}` : undefined
    const title = `${playerName}'s Malifaux Buried ${params.year} — ${SITE_NAME}`

    return seo({
      title: shared && edition ? `${edition.cardTitle(shared)} — ${title}` : title,
      description: `${playerName}'s ${params.year} in UK Malifaux: events, factions, podiums and painting, shuffled into a deck of cards.`,
      path,
      image: sharedImage ?? summaryImage,
      imageShape: sharedImage ? 'portrait' : 'wide',
      type: 'profile',
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { playerName, cards, cardBackImageKey, url } = Route.useLoaderData()
  const { id, year } = Route.useParams()
  const { card } = Route.useSearch()
  const navigate = Route.useNavigate()
  const edition = buriedEdition(year)!

  const onChange = useCallback(
    (key: string | undefined) =>
      navigate({ search: key ? { card: key } : {}, replace: true, resetScroll: false }),
    [navigate],
  )

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <header className="text-center">
        <h1 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase">Malifaux Buried {year}</h1>
        <p className="text-sm text-muted-foreground">
          <Link to="/player/$id" params={{ id }} search={{ typeCode: undefined, tab: undefined, painting: undefined, achievement: undefined }}>
            {playerName}
          </Link>
          's year at the table. Tap, swipe or use the arrow keys to flip.
        </p>
      </header>
      <Deck
        cards={cards}
        year={year}
        playerName={playerName}
        url={url}
        cardBackImageKey={cardBackImageKey}
        activeKey={card}
        onChange={onChange}
        renderFace={(c) => edition.renderFace(c, year)}
        cardTitle={edition.cardTitle}
      />
    </div>
  )
}
