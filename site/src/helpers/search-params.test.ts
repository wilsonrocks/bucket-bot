import { describe, expect, it } from 'vitest'
import { optionalFlag } from './search-params'

describe('optionalFlag', () => {
  it('is true for a parsed or string true', () => {
    expect(optionalFlag(true)).toBe(true)
    expect(optionalFlag('true')).toBe(true)
  })

  it('is undefined for anything else', () => {
    expect(optionalFlag(false)).toBeUndefined()
    expect(optionalFlag('false')).toBeUndefined()
    expect(optionalFlag(undefined)).toBeUndefined()
    expect(optionalFlag(1)).toBeUndefined()
  })
})
