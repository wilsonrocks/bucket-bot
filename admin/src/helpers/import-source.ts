interface ImportSourceArgs {
  longshanks_id: string | null
  bot_id: string | null
}

export interface ImportSource {
  /** Short provider name for the badge label. */
  provider: 'Longshanks' | 'BOT'
  /** Mantine badge colour. */
  color: string
  /** Public source page to open for sense-checking, when one exists. */
  url: string | null
  /** The provider's own id for this event, for display in a tooltip. */
  externalId: string
}

/**
 * Derives the import source of a tourney so the edit page can show a badge that
 * lets admins sense-check the import against the original. Returns null for
 * manually-created events (no external id) — this also covers legacy BOT events,
 * which have no bot_id and are no longer viewable. Both Longshanks and BOT4 link
 * out to their public event pages.
 */
export function getImportSource({
  longshanks_id,
  bot_id,
}: ImportSourceArgs): ImportSource | null {
  if (longshanks_id) {
    return {
      provider: 'Longshanks',
      color: 'blue',
      url: `https://malifaux.longshanks.org/event/${longshanks_id}/`,
      externalId: longshanks_id,
    }
  }
  if (bot_id) {
    return {
      provider: 'BOT',
      color: 'grape',
      url: `https://bag-o-tools.web.app/events/${bot_id}`,
      externalId: bot_id,
    }
  }
  return null
}
