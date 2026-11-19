import { describe, expect, test } from 'vitest'
import { seo } from './seo'

function meta(output: ReturnType<typeof seo>, key: string) {
  return output.meta.find(
    (m) => ('property' in m && m.property === key) || ('name' in m && m.name === key),
  ) as { content: string } | undefined
}

describe('seo', () => {
  test('a wide image is declared as 1200x630 with a large card', () => {
    const out = seo({ title: 't', path: '/x', image: 'https://a/b-ogp.jpg' })
    expect(meta(out, 'og:image:width')?.content).toBe('1200')
    expect(meta(out, 'og:image:height')?.content).toBe('630')
    expect(meta(out, 'twitter:card')?.content).toBe('summary_large_image')
  })

  test('a square image gets no 1200x630 dimensions and a thumbnail card', () => {
    const out = seo({
      title: 't',
      path: '/x',
      image: 'https://cdn.discordapp.com/avatars/1/abc.webp',
      imageShape: 'square',
    })
    expect(meta(out, 'og:image:width')).toBeUndefined()
    expect(meta(out, 'og:image:height')).toBeUndefined()
    expect(meta(out, 'twitter:card')?.content).toBe('summary')
    expect(meta(out, 'og:image:type')?.content).toBe('image/webp')
  })

  test('a portrait image is declared as 1080x1350 with a large card', () => {
    const out = seo({ title: 't', path: '/x', image: 'https://a/card.png', imageShape: 'portrait' })
    expect(meta(out, 'og:image:width')?.content).toBe('1080')
    expect(meta(out, 'og:image:height')?.content).toBe('1350')
    expect(meta(out, 'twitter:card')?.content).toBe('summary_large_image')
    expect(meta(out, 'og:image:type')?.content).toBe('image/png')
  })

  test('og:url is the shared link while the canonical stays the page', () => {
    const out = seo({ title: 't', path: '/x', sharePath: '/x?card=A' })
    expect(meta(out, 'og:url')?.content).toBe('https://malifaux.uk/x?card=A')
    expect(out.links).toEqual([{ rel: 'canonical', href: 'https://malifaux.uk/x' }])
  })

  test('og:url defaults to the canonical', () => {
    expect(meta(seo({ title: 't', path: '/x' }), 'og:url')?.content).toBe('https://malifaux.uk/x')
  })

  test('the default image keeps the large card', () => {
    const out = seo({ title: 't', path: '/x' })
    expect(meta(out, 'twitter:card')?.content).toBe('summary_large_image')
    expect(meta(out, 'og:image:type')?.content).toBe('image/png')
  })
})
