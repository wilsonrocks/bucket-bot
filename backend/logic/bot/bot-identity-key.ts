/**
 * BOT4 league entries carry two ids, and only one of them identifies a person.
 *
 * `uid` is the event-entry id (the Firestore doc at `eventsV4/{eventId}/players/{uid}`),
 * minted fresh for every event — the same player has a different `uid` in each one.
 * `profileId` is the player's BOT profile and is stable across events, but it's null
 * for entries a TO typed in for someone without a BOT account.
 *
 * So a claimed entry keys on `profileId`, and an unclaimed one keys on the event plus
 * the player's name. The event prefix is deliberate: it scopes the key to a single
 * event so the importer can never silently link two people who happen to share a name.
 * Those entries are mapped by hand on the identities page, as they always have been.
 */

/** Trims and collapses runs of inner whitespace. Case is preserved. */
export function normaliseBotName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function botIdentityKey(
  entry: { name: string; profileId?: string | null | undefined },
  botid: string,
): string {
  // Stored verbatim. Most profile ids carry a `profile-` prefix but some are bare,
  // and a player is consistently one or the other, so rewriting either form would
  // just break matching.
  const profileId = entry.profileId?.trim();
  if (profileId) return profileId;

  return `${botid}:${normaliseBotName(entry.name)}`;
}
