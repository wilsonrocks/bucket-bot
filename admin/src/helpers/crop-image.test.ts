import { describe, expect, it } from 'vitest'
import { computeRotatedBounds, getOutputType, renameForExt } from './crop-image'

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
