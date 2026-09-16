import { describe, expect, it } from 'vitest'
import { achievementsTabLabel, earnedCount, groupAchievements } from './achievements'

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

describe('groupAchievements', () => {
  it('groups in first-appearance order, keeping order within each group', () => {
    const groups = groupAchievements([
      { id: 'a', groupName: 'General' },
      { id: 'b', groupName: 'Guild' },
      { id: 'c', groupName: 'General' },
      { id: 'd', groupName: 'Bayou' },
    ])
    expect(groups).toEqual([
      { name: 'General', achievements: [{ id: 'a', groupName: 'General' }, { id: 'c', groupName: 'General' }] },
      { name: 'Guild', achievements: [{ id: 'b', groupName: 'Guild' }] },
      { name: 'Bayou', achievements: [{ id: 'd', groupName: 'Bayou' }] },
    ])
  })

  it('returns no groups for no achievements', () => {
    expect(groupAchievements([])).toEqual([])
  })
})

describe('earnedCount', () => {
  it('counts achievements with a date', () => {
    expect(earnedCount([{ achievedOn: '2025-01-01' }, { achievedOn: null }])).toBe(1)
  })
})
