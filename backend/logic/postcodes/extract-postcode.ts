// Matches a UK postcode anywhere in a free-text string (e.g. a calendar
// location). Handles the optional space between the outward and inward codes.
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

/**
 * Pulls the first UK postcode out of a free-text string, normalised to
 * uppercase with a single space before the inward code. Returns null if none
 * is found.
 */
export function extractUkPostcode(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(UK_POSTCODE_RE);
  if (!match) return null;
  const compact = match[0].replace(/\s+/g, "").toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
