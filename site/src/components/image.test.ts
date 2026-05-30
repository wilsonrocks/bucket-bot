import { describe, expect, it } from 'vitest'
import { buildSrcSet } from './image'

describe('buildSrcSet', () => {
  it('lists every width variant with a width descriptor', () => {
    const srcSet = buildSrcSet('team/abc123')
    const entries = srcSet.split(', ')
    expect(entries).toHaveLength(4)
    expect(entries.map((e) => e.split(' ').pop())).toEqual(['150w', '400w', '800w', '1200w'])
  })

  it('embeds the image key in each webp variant url', () => {
    const srcSet = buildSrcSet('painting/deadbeef')
    expect(srcSet).toContain('painting/deadbeef-w150.webp 150w')
    expect(srcSet).toContain('painting/deadbeef-w1200.webp 1200w')
  })
})
