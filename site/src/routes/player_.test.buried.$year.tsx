import { createFileRoute, lazyRouteComponent, notFound } from '@tanstack/react-router'
import { optionalString } from '#/helpers/search-params'

// Dev-only: choose a Buried card and edit its data to see the face. The static
// `test` segment outranks player_.$id.buried.$year's `$id`, so the two don't
// clash. Deliberately left out of the sitemap and site search.
export const Route = createFileRoute('/player_/test/buried/$year')({
  params: {
    parse: (raw: Record<string, string>) => ({ year: Number(raw.year) }),
    stringify: (p: { year: number }) => ({ year: String(p.year) }),
  },
  validateSearch: (search: Record<string, unknown>): { key?: string } => {
    const key = optionalString(search.key)
    return key ? { key } : {}
  },
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  head: ({ params }) => ({
    meta: [{ title: `Buried ${params.year} card playground` }, { name: 'robots', content: 'noindex' }],
  }),
  component: lazyRouteComponent(() => import('#/buried/playground')),
})
