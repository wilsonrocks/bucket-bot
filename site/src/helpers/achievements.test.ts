import { describe, expect, it } from 'vitest'
import {
  achievementShareText,
  achievementShareUrl,
  achievementsTabLabel,
  earnedCount,
  groupAchievements,
} from './achievements'

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

describe('achievementShareUrl', () => {
  it('links to the player achievements tab with the achievement open', () => {
    expect(achievementShareUrl(7, 'FIRST_EVENT')).toBe(
      'https://malifaux.uk/player/7?tab=achievements&achievement=FIRST_EVENT',
    )
  })

  it('encodes the achievement id', () => {
    expect(achievementShareUrl(7, 'A&B')).toBe('https://malifaux.uk/player/7?tab=achievements&achievement=A%26B')
  })
})

describe('achievementShareText', () => {
  it('names the player and achievement', () => {
    expect(achievementShareText('Alice', 'Winner')).toBe('Alice earned the “Winner” achievement')
  })
})
