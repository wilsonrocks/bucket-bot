import { describe, expect, it } from 'vitest'
import { playerShortName } from './player-short-name'

describe('playerShortName', () => {
  it('returns short_name when provided', () => {
    expect(playerShortName({ name: 'Jonathan Smith', short_name: 'Jon' })).toBe('Jon')
  })

  it('returns first 9 chars of first name + initial for multi-word names when short_name is null', () => {
    expect(playerShortName({ name: 'Jonathan Smith', short_name: null })).toBe('Jonathan S')
  })

  it('returns name as-is for single short names when short_name is null', () => {
    expect(playerShortName({ name: 'James', short_name: null })).toBe('James')
  })

  it('truncates to 10 chars for single long names when short_name is null', () => {
    expect(playerShortName({ name: 'Maximilianos', short_name: null })).toBe('Maximilian')
  })
})
