/**
 * Exits non-zero if any env var the backend can't run without is unset. The
 * deploy runs this in the new image, with prod's env, before restarting the
 * service — so a missing var fails the deploy instead of the live API.
 */
export const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SITE_URL",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URL",
  "ASSETS_ACCESS_KEY_ID",
  "ASSETS_SECRET_ACCESS_KEY",
  "ASSETS_BUCKET_NAME",
] as const;

export function missingEnvVars(
  env: Record<string, string | undefined>,
): string[] {
  return REQUIRED_ENV_VARS.filter((name) => !env[name]);
}

if (require.main === module) {
  const missing = missingEnvVars(process.env);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("All required env vars are set");
}
