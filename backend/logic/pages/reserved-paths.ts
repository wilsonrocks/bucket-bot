// No imports: site/ imports this file directly to check its routes are all listed.

/**
 * First path segments owned by the site's own routes (or other infrastructure).
 * CMS pages are matched after every site route, so a page under one of these
 * could never be shown — saving one is rejected instead.
 *
 * site/src/helpers/reserved-paths.test.ts fails if a site route is missing here.
 */
export const RESERVED_FIRST_SEGMENTS: readonly string[] = [
  "api",
  "assets",
  "best-painted",
  "event",
  "events",
  "faction-rankings",
  "player",
  "players",
  "rankings",
  "regions",
  "sitemap.xml",
  "team",
  "team-rankings",
  "teams",
  "upcoming-event",
  "upcoming-events",
];

export const PAGE_URL_PATTERN = /^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/;

/** Trims, ensures a single leading slash and drops trailing slashes. Case is kept so bad input is rejected visibly. */
export function normaliseUrl(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${trimmed}`;
}

/** Returns an error message, or null if `url` (already normalised) can be used for a page. */
export function validatePageUrl(url: string): string | null {
  if (url === "/") return "The homepage can't be a CMS page";
  if (!PAGE_URL_PATTERN.test(url)) {
    return "URL segments may only contain lowercase letters, numbers and single hyphens, e.g. /guides/new-players";
  }
  const firstSegment = url.split("/")[1] ?? "";
  if (RESERVED_FIRST_SEGMENTS.includes(firstSegment)) {
    return `/${firstSegment} is already used by the site`;
  }
  return null;
}
