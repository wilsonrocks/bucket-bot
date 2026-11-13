import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { RESERVED_FIRST_SEGMENTS, validatePageUrl } from '../../../backend/logic/pages/reserved-paths'

const routesDir = fileURLToPath(new URL('../routes', import.meta.url))

/** First URL segment of each file-based route: `team.$id.tsx` → `team`, `sitemap[.]xml.ts` → `sitemap.xml`. */
function routeFirstSegments(): Set<string> {
  const segments = new Set<string>()
  for (const entry of readdirSync(routesDir, { withFileTypes: true })) {
    const name = entry.isFile() ? entry.name.replace(/\.(tsx?|jsx?)$/, '') : entry.name
    if (name.includes('.test')) continue
    const first = name.split(/(?<!\[)\.(?!\])/)[0]!.replace(/\[(.)\]/g, '$1')
    // Skip the root, index, pathless (_foo) and the CMS splat route itself.
    if (first === '' || first === 'index' || first.startsWith('_') || first.startsWith('$')) continue
    segments.add(first)
  }
  return segments
}

describe('CMS reserved paths', () => {
  // CMS pages match after every site route, so the backend has to know each
  // route's first segment to reject page URLs that could never be shown.
  it('lists the first segment of every site route', () => {
    const segments = routeFirstSegments()
    expect(segments.size).toBeGreaterThan(5)
    expect(segments).toContain('sitemap.xml')
    expect(segments).toContain('team')
    for (const segment of segments) {
      expect(RESERVED_FIRST_SEGMENTS, `add "${segment}" to backend/logic/pages/reserved-paths.ts`).toContain(segment)
    }
  })

  it('allows a page at a URL that is no longer a site route', () => {
    expect(validatePageUrl('/how-it-works')).toBeNull()
  })
})
