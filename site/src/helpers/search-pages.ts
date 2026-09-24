import type { FileRouteTypes } from '#/routeTree.gen'

type SearchPage = { label: string; keywords?: string[] }

// Every route must say how the site search finds it, so adding a route without
// deciding is a type error. 'dynamic' pages come from the database in
// `searchSite` (#/queries) — keep that and sitemap[.]xml.ts in step.
const SEARCH_PAGES: Record<FileRouteTypes['fullPaths'], SearchPage | 'dynamic' | 'excluded'> = {
  '/': 'excluded',
  '/sitemap.xml': 'excluded',
  '/events': { label: 'Past Events', keywords: ['tournaments', 'results'] },
  '/upcoming-events': { label: 'Upcoming Events', keywords: ['tournaments', 'calendar'] },
  '/players': { label: 'Players' },
  '/rankings': { label: 'Rankings', keywords: ['players', 'leaderboard'] },
  '/faction-rankings': { label: 'Faction Rankings', keywords: ['factions'] },
  '/teams': { label: 'Teams', keywords: ['clubs'] },
  '/team-rankings': { label: 'Team Rankings', keywords: ['clubs', 'leaderboard'] },
  '/regions': { label: 'Regions', keywords: ['map', 'towns'] },
  '/best-painted': { label: 'Best Painted', keywords: ['painting'] },
  '/how-it-works': { label: 'How It Works', keywords: ['points', 'scoring', 'faq'] },
  '/event/$id': 'dynamic',
  '/player/$id': 'dynamic',
  '/team/$id': 'dynamic',
  '/upcoming-event/$id': 'dynamic',
}

export type StaticPageMatch = { href: string; label: string }

/**
 * Static pages whose label or keywords have a word starting with each word of
 * `text`, so "fac" finds Faction Rankings and "team rank" finds Team Rankings.
 */
export function matchStaticPages(text: string): StaticPageMatch[] {
  const queryWords = text.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  if (!queryWords) return []
  const matches: StaticPageMatch[] = []
  for (const [href, page] of Object.entries(SEARCH_PAGES)) {
    if (typeof page === 'string') continue
    const pageWords = [page.label, ...(page.keywords ?? [])].join(' ').toLowerCase().split(/\s+/)
    if (queryWords.every((q) => pageWords.some((w) => w.startsWith(q)))) {
      matches.push({ href, label: page.label })
    }
  }
  return matches
}
