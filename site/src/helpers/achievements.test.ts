import { describe, expect, it } from 'vitest'
import { achievementsTabLabel } from './achievements'

describe('achievementsTabLabel', () => {
  it('shows earned out of total', () => {
    expect(
      achievementsTabLabel([{ achievedOn: '2025-01-01' }, { achievedOn: null }, { achievedOn: null }]),
    ).toBe('Achievements (1/3)')
  })

  it('shows zero earned', () => {
    expect(achievementsTabLabel([{ achievedOn: null }])).toBe('Achievements (0/1)')
  })

  it('omits counts when there are no achievements', () => {
    expect(achievementsTabLabel([])).toBe('Achievements')
  })
})
