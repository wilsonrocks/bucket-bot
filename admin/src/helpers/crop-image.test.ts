import { describe, expect, it, vi } from 'vitest'
import {
  computeRotatedBounds,
  encodeWithinLimit,
  formatBytes,
  scaleToFit,
  getOutputType,
  percentCropToPixels,
  renameForExt,
} from './crop-image'

describe('computeRotatedBounds', () => {
  it('leaves an unrotated image alone', () => {
    expect(computeRotatedBounds(800, 600, 0)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('swaps the axes at 90 and 270 degrees', () => {
    expect(computeRotatedBounds(800, 600, 90)).toEqual({
      width: 600,
      height: 800,
    })
    expect(computeRotatedBounds(800, 600, 270)).toEqual({
      width: 600,
      height: 800,
    })
  })

  it('is unchanged at 180 degrees', () => {
    expect(computeRotatedBounds(800, 600, 180)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('grows enough to contain the image at 45 degrees', () => {
    const bounds = computeRotatedBounds(800, 600, 45)
    expect(bounds.width).toBeGreaterThan(800)
    expect(bounds.height).toBeGreaterThan(600)
    // Both axes are (w + h) / sqrt(2) for a 45 degree turn.
    expect(bounds.width).toBe(Math.round(1400 / Math.SQRT2))
    expect(bounds.height).toBe(Math.round(1400 / Math.SQRT2))
  })

  it('handles negative rotations the same as their positive mirror', () => {
    expect(computeRotatedBounds(800, 600, -90)).toEqual(
      computeRotatedBounds(800, 600, 90),
    )
  })
})

describe('percentCropToPixels', () => {
  const bounds = { width: 800, height: 600 }

  it('maps a full selection onto the whole image', () => {
    expect(
      percentCropToPixels({ x: 0, y: 0, width: 100, height: 100 }, bounds),
    ).toEqual({ x: 0, y: 0, width: 800, height: 600 })
  })

  it('maps a centred quarter selection', () => {
    expect(
      percentCropToPixels({ x: 25, y: 25, width: 50, height: 50 }, bounds),
    ).toEqual({ x: 200, y: 150, width: 400, height: 300 })
  })

  it('rounds to whole pixels', () => {
    expect(
      percentCropToPixels({ x: 10.4, y: 0, width: 33.3, height: 100 }, bounds),
    ).toEqual({ x: 83, y: 0, width: 266, height: 600 })
  })

  it('uses the rotated bounds, so a quarter turn swaps the axes', () => {
    const rotated = computeRotatedBounds(800, 600, 90)
    expect(
      percentCropToPixels({ x: 0, y: 0, width: 50, height: 50 }, rotated),
    ).toEqual({ x: 0, y: 0, width: 300, height: 400 })
  })
})

describe('getOutputType', () => {
  it('keeps formats the upload endpoint already accepts', () => {
    expect(getOutputType('image/png')).toEqual({ type: 'image/png', ext: 'png' })
    expect(getOutputType('image/webp')).toEqual({
      type: 'image/webp',
      ext: 'webp',
    })
  })

  it('re-encodes anything else as jpeg', () => {
    expect(getOutputType('image/jpeg')).toEqual({
      type: 'image/jpeg',
      ext: 'jpg',
    })
    expect(getOutputType('image/heic')).toEqual({
      type: 'image/jpeg',
      ext: 'jpg',
    })
    expect(getOutputType('image/avif')).toEqual({
      type: 'image/jpeg',
      ext: 'jpg',
    })
    expect(getOutputType('')).toEqual({ type: 'image/jpeg', ext: 'jpg' })
  })
})

describe('renameForExt', () => {
  it('replaces the existing extension', () => {
    expect(renameForExt('IMG_1234.HEIC', 'jpg')).toBe('IMG_1234.jpg')
    expect(renameForExt('nice-model.png', 'png')).toBe('nice-model.png')
  })

  it('keeps dots that are part of the name', () => {
    expect(renameForExt('lady.justice.v2.jpeg', 'jpg')).toBe(
      'lady.justice.v2.jpg',
    )
  })

  it('adds an extension when there is none', () => {
    expect(renameForExt('pasted-image', 'jpg')).toBe('pasted-image.jpg')
  })

  it('falls back to a name when there is nothing left', () => {
    expect(renameForExt('.png', 'jpg')).toBe('image.jpg')
  })
})

describe('encodeWithinLimit', () => {
  /**
   * A stand-in for the canvas: bytes scale with pixel count (scale²), lossy
   * formats are a fraction of PNG, and lower quality is a bit smaller still.
   */
  function fakeEncoder(
    fullSizeBytes: number,
    { webpSupported = true }: { webpSupported?: boolean } = {},
  ) {
    return vi.fn(async (scale: number, type: string, quality: number) => {
      const actualType =
        type === 'image/webp' && !webpSupported ? 'image/png' : type
      const formatFactor = actualType === 'image/png' ? 1 : 0.3
      const size = Math.round(
        fullSizeBytes * scale * scale * formatFactor * quality,
      )
      return new Blob([new Uint8Array(size)], { type: actualType })
    })
  }

  it('keeps the first encode when it already fits', async () => {
    const encode = fakeEncoder(1000)
    const blob = await encodeWithinLimit(encode, 'image/png', 5000)
    expect(blob.type).toBe('image/png')
    expect(encode).toHaveBeenCalledTimes(1)
    expect(encode).toHaveBeenCalledWith(1, 'image/png', 0.92)
  })

  it('switches a too-big PNG to WebP at full size before shrinking', async () => {
    const encode = fakeEncoder(30_000)
    const blob = await encodeWithinLimit(encode, 'image/png', 10_000)
    expect(blob.type).toBe('image/webp')
    expect(blob.size).toBeLessThanOrEqual(10_000)
    expect(encode).toHaveBeenLastCalledWith(1, 'image/webp', 0.85)
  })

  it('scales a JPEG down until it fits', async () => {
    const encode = fakeEncoder(200_000)
    const blob = await encodeWithinLimit(encode, 'image/jpeg', 10_000)
    expect(blob.type).toBe('image/jpeg')
    expect(blob.size).toBeLessThanOrEqual(10_000)
    const [lastScale] = encode.mock.calls.at(-1)!
    expect(lastScale).toBeLessThan(1)
    expect(encode.mock.calls.length).toBeLessThanOrEqual(4)
  })

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    const encode = fakeEncoder(30_000, { webpSupported: false })
    const blob = await encodeWithinLimit(encode, 'image/png', 10_000)
    expect(blob.type).toBe('image/jpeg')
    expect(blob.size).toBeLessThanOrEqual(10_000)
  })

  it('gives up with a clear error rather than looping forever', async () => {
    const encode = vi.fn(
      async (_scale: number, type: string) =>
        new Blob([new Uint8Array(100)], { type }),
    )
    await expect(
      encodeWithinLimit(encode, 'image/jpeg', 50),
    ).rejects.toThrow(/Could not shrink/)
  })
})

describe('scaleToFit', () => {
  it('leaves images within the limit at full size', () => {
    expect(scaleToFit(4000, 3000)).toBe(1)
    expect(scaleToFit(800, 600)).toBe(1)
  })

  it('scales the longest edge down to the limit', () => {
    expect(scaleToFit(8000, 6000)).toBe(0.5)
    expect(scaleToFit(6000, 8000)).toBe(0.5)
    expect(scaleToFit(2000, 1000, 1000)).toBe(0.5)
  })
})

describe('encodeWithinLimit start scale', () => {
  it('starts from the given scale rather than full size', async () => {
    const encode = vi.fn(
      async (_scale: number, type: string) =>
        new Blob([new Uint8Array(10)], { type }),
    )
    await encodeWithinLimit(encode, 'image/jpeg', 1000, 0.5)
    expect(encode).toHaveBeenCalledWith(0.5, 'image/jpeg', 0.92)
  })
})

describe('formatBytes', () => {
  it('shows megabytes to one decimal place', () => {
    expect(formatBytes(0)).toBe('0.0 MB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(4.25 * 1024 * 1024)).toBe('4.3 MB')
  })
})
