const DEFAULT_SITE_URL = "https://malifaux.uk";

/**
 * Base URL of the public site, for links the bot posts. Set SITE_URL locally
 * (e.g. http://localhost:3001) so dev links point at the dev site.
 */
export function getSiteUrl(): string {
  return process.env.SITE_URL ?? DEFAULT_SITE_URL;
}
