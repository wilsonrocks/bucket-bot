type IdentityWithResults = {
  results: { tourney_id: number | null; tourney_name: string }[]
}

export type EventOption = { value: string; label: string }

// Distinct events across all identities, in first-seen order. Identities arrive
// newest-first, so the most recently imported events lead the list.
export function eventOptions(identities: IdentityWithResults[]): EventOption[] {
  const counts = new Map<number, { name: string; count: number }>()
  for (const identity of identities) {
    const seen = new Set<number>()
    for (const { tourney_id, tourney_name } of identity.results) {
      if (tourney_id === null || seen.has(tourney_id)) continue
      seen.add(tourney_id)
      const entry = counts.get(tourney_id)
      if (entry) entry.count++
      else counts.set(tourney_id, { name: tourney_name, count: 1 })
    }
  }
  return [...counts].map(([id, { name, count }]) => ({
    value: String(id),
    label: `${name} (${count})`,
  }))
}

export function filterByEvent<T extends IdentityWithResults>(identities: T[], tourneyId: string | null): T[] {
  if (tourneyId === null) return identities
  const id = Number(tourneyId)
  return identities.filter((identity) => identity.results.some((r) => r.tourney_id === id))
}
