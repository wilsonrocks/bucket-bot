export type Theme = 'light' | 'dark'
export type ResolvedTheme = Theme

export const THEME_COOKIE = 'theme'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/**
 * Resolves the effective theme. A `null` preference (no cookie) follows the OS
 * `prefers-color-scheme`; on the server, where that's unknown, it falls back to light.
 */
export function resolveTheme(theme: Theme | null): ResolvedTheme {
  if (theme) return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Applies the resolved theme to the document (client only). */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function writeThemeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}

/**
 * Synchronous, self-contained snippet injected into <head> before paint.
 * Applies the cookie preference, or the OS preference when the cookie is unset,
 * so there is no flash of the wrong theme. Stringified into an inline script.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);var t=m&&m[1];var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`
