import { describe, expect, it } from 'vitest'
import { matchStaticPages } from './search-pages'

const hrefs = (text: string) => matchStaticPages(text).map((m) => m.href)

describe('matchStaticPages', () => {
  it('matches label word prefixes', () => {
    expect(hrefs('fac')).toEqual(['/faction-rankings'])
    expect(hrefs('How')).toEqual(['/how-it-works'])
  })

  it('requires every word to match', () => {
    expect(hrefs('team rank')).toEqual(['/team-rankings'])
    expect(hrefs('rank')).toEqual(expect.arrayContaining(['/rankings', '/faction-rankings', '/team-rankings']))
  })

  it('matches keywords', () => {
    expect(hrefs('painting')).toEqual(['/best-painted'])
    expect(hrefs('scoring')).toEqual(['/how-it-works'])
  })

  it('never returns dynamic or excluded routes', () => {
    const all = hrefs('e')
    expect(all.some((h) => h.includes('$') || h === '/' || h === '/sitemap.xml')).toBe(false)
  })

  it('returns nothing without words', () => {
    expect(matchStaticPages('')).toEqual([])
    expect(matchStaticPages('()')).toEqual([])
  })
})
