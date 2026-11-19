import { describe, expect, it } from 'vitest'
import { luminance, textOn } from './text-on'

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1)
  })
  it('accepts no leading # and surrounding space', () => {
    expect(luminance(' ffffff ')).toBeCloseTo(1)
  })
  it('is null for non-hex input', () => {
    expect(luminance('red')).toBeNull()
    expect(luminance('#fff')).toBeNull()
  })
})

describe('textOn', () => {
  it('uses dark text on light faction colours', () => {
    expect(textOn('#cdae1c')).toBe('#15110e') // Outcasts
  })
  it('uses white text on dark faction colours', () => {
    expect(textOn('#8558a5')).toBe('#ffffff') // Neverborn
    expect(textOn('#cf1e24')).toBe('#ffffff') // Guild
  })
  it('falls back for junk', () => {
    expect(textOn('nope', '#abcdef')).toBe('#abcdef')
  })
})
