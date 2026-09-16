/** Tab label summarising how many achievements a player has earned, e.g. "Achievements (1/2)". */
export function achievementsTabLabel(achievements: { achievedOn: string | null }[]): string {
  if (achievements.length === 0) return 'Achievements'
  const earned = achievements.filter((a) => a.achievedOn !== null).length
  return `Achievements (${earned}/${achievements.length})`
}
