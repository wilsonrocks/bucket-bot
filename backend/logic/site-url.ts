/**
 * Base URL of the public site, for links the bot posts. Required, so a dev
 * backend can't silently post links to prod: set SITE_URL to
 * http://localhost:3001 locally and https://malifaux.uk in production.
 */
export function getSiteUrl(): string {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL is not defined");
  return siteUrl;
}
