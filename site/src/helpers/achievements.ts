import { absoluteUrl } from './seo'

/** Achievements are shown on the site only alongside the backend's achievements scheduler. */
export function achievementsEnabled(env: Record<string, string | undefined>): boolean {
  return env.ENABLE_ACHIEVEMENTS_SCHEDULER === 'true'
}

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

/** Page showing a single earned achievement, opened in a modal on the player page. */
export function achievementShareUrl(playerId: number, achievementId: string): string {
  const params = new URLSearchParams({ tab: 'achievements', achievement: achievementId })
  return absoluteUrl(`/player/${playerId}?${params}`)
}

export function achievementShareText(playerName: string, achievementName: string): string {
  return `${playerName} earned the “${achievementName}” achievement`
}

/** How many players hold an achievement, e.g. "Earned by 3 players". */
export function playerCountLabel(count: number): string {
  if (count === 0) return 'No players have earned this yet'
  return `Earned by ${count} ${count === 1 ? 'player' : 'players'}`
}
