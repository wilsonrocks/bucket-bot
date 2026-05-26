import { describe, expect, it } from 'vitest'
import { toOrdinal } from './to-ordinal'

describe('toOrdinal', () => {
  it('handles 1, 2, 3', () => {
    expect(toOrdinal(1)).toBe('1st')
    expect(toOrdinal(2)).toBe('2nd')
    expect(toOrdinal(3)).toBe('3rd')
  })

  it('uses th for 4-10', () => {
    expect(toOrdinal(4)).toBe('4th')
    expect(toOrdinal(10)).toBe('10th')
  })

  it('uses th for the teens', () => {
    expect(toOrdinal(11)).toBe('11th')
    expect(toOrdinal(12)).toBe('12th')
    expect(toOrdinal(13)).toBe('13th')
  })

  it('handles larger numbers', () => {
    expect(toOrdinal(21)).toBe('21st')
    expect(toOrdinal(22)).toBe('22nd')
    expect(toOrdinal(23)).toBe('23rd')
    expect(toOrdinal(101)).toBe('101st')
    expect(toOrdinal(111)).toBe('111th')
    expect(toOrdinal(112)).toBe('112th')
  })
})
