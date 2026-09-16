type EarnableAchievement = { achievedOn: string | null }

/** Label summarising how many achievements were earned, e.g. "Achievements (1/2)". */
export function achievementsTabLabel(achievements: EarnableAchievement[]): string {
  if (achievements.length === 0) return 'Achievements'
  return `Achievements (${earnedCount(achievements)}/${achievements.length})`
}

export function earnedCount(achievements: EarnableAchievement[]): number {
  return achievements.filter((a) => a.achievedOn !== null).length
}

/**
 * Splits achievements into their groups, keeping the incoming (display) order
 * both within a group and between groups — a group appears where its first
 * achievement does.
 */
export function groupAchievements<T extends { groupName: string }>(
  achievements: T[],
): { name: string; achievements: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const achievement of achievements) {
    const group = groups.get(achievement.groupName)
    if (group) group.push(achievement)
    else groups.set(achievement.groupName, [achievement])
  }
  return [...groups].map(([name, items]) => ({ name, achievements: items }))
}
