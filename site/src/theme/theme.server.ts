import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { type Theme, THEME_COOKIE, isTheme } from './theme'

/**
 * Reads the persisted theme preference from the request cookie during SSR.
 * Returns `null` when unset — the client then follows the OS preference.
 */
export const getThemeCookie = createServerFn().handler((): Theme | null => {
  const value = getCookie(THEME_COOKIE)
  return isTheme(value) ? value : null
})
