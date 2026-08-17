import { describe, expect, it } from 'vitest'
import { getImportSource } from './import-source'

describe('getImportSource', () => {
  it('returns a linked Longshanks source when longshanks_id is set', () => {
    expect(getImportSource({ longshanks_id: '22198', bot_id: null })).toEqual({
      provider: 'Longshanks',
      color: 'blue',
      url: 'https://malifaux.longshanks.org/event/22198/',
      externalId: '22198',
    })
  })

  it('returns a linked BOT source when bot_id is set', () => {
    expect(
      getImportSource({ longshanks_id: null, bot_id: 'iSaekelxp22sIw493rXE' }),
    ).toEqual({
      provider: 'BOT',
      color: 'grape',
      url: 'https://bag-o-tools.web.app/events/iSaekelxp22sIw493rXE',
      externalId: 'iSaekelxp22sIw493rXE',
    })
  })

  it('prefers Longshanks when both ids are present', () => {
    expect(
      getImportSource({ longshanks_id: '22198', bot_id: 'abc' })?.provider,
    ).toBe('Longshanks')
  })

  it('returns null for a manually-created event with no external id', () => {
    expect(getImportSource({ longshanks_id: null, bot_id: null })).toBeNull()
  })
})
