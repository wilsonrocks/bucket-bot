// Copy of backend/logic/search/prefix-tsquery.ts — site/ cannot import backend code.
/**
 * Turns free text into a prefix tsquery string for `to_tsquery('simple', …)`,
 * so "rad (wa" becomes "rad:* & wa:*" and matches "Radek (washed up…)" while
 * the user is still typing. Postgres's input-safe parsers (plainto_tsquery,
 * websearch_to_tsquery) can't express prefix matches, and to_tsquery errors on
 * raw input, so only letters and digits are passed through.
 *
 * Returns null when the text has no words to search for.
 */
export function prefixTsquery(text: string): string | null {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!words) return null;
  return words.map((word) => `${word}:*`).join(" & ");
}
