// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ShareButton, ShareImageButton, shareFileName } from './share-button'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('shareFileName', () => {
  test('slugs the parts into a readable png name', () => {
    expect(shareFileName('Oli Hedges', 'malifaux buried', 2026, 'EVENTS_WON')).toBe(
      'oli-hedges-malifaux-buried-2026-events-won.png',
    )
  })
  test('drops accents and punctuation', () => {
    expect(shareFileName("Zoë O'Brien!", 2026)).toBe('zoe-o-brien-2026.png')
  })
  test('never empty', () => {
    expect(shareFileName('!!!')).toBe('image.png')
  })
})

const stubImageFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(new Blob(['png'], { type: 'image/png' }))),
  )

describe('ShareImageButton', () => {
  test('shares just the file, under the friendly name, where files can be shared', async () => {
    stubImageFetch()
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share, canShare: () => true })

    render(<ShareImageButton imageUrl="https://assets.example/x/abc123-EVENTS_WON.png" fileName="alice-wins.png" title="Wins" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Share image' }))

    expect(share).toHaveBeenCalledTimes(1)
    const data = (share.mock.calls[0] as unknown as [ShareData])[0]
    expect(data.url).toBeUndefined()
    expect(data.text).toBeUndefined()
    expect(data.files!.map((f) => f.name)).toEqual(['alice-wins.png'])
  })

  test('is a named download where files cannot be shared', async () => {
    stubImageFetch()
    vi.stubGlobal('navigator', { ...navigator, share: undefined, canShare: undefined })

    render(<ShareImageButton imageUrl="https://assets.example/x.png" fileName="alice-wins.png" title="Wins" />)
    const link = screen.getByRole('link', { name: 'Save image' })
    expect(link.getAttribute('download')).toBe('alice-wins.png')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  test('falls back to opening the image if it cannot be fetched', () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('CORS') }))
    render(<ShareImageButton imageUrl="https://assets.example/x.png" fileName="a.png" title="t" />)
    expect(screen.getByRole('link', { name: 'Save image' }).getAttribute('href')).toBe('https://assets.example/x.png')
  })
})

describe('ShareButton', () => {
  test('shares the link with its text', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareButton url="https://malifaux.uk/x" title="T" text="hello" label="Share link" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share link' }))
    expect(share).toHaveBeenCalledWith({ title: 'T', text: 'hello', url: 'https://malifaux.uk/x' })
  })
})
