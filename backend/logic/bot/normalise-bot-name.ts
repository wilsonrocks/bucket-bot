/** Trims and collapses runs of inner whitespace. Case is preserved. */
export function normaliseBotName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
