import { createServerFn } from '@tanstack/react-start'
import { navPages } from '#/queries'
import { readThemeCookie } from '#/theme/theme-cookie'

/**
 * Everything the root layout needs, in one server round trip — the root loader
 * runs on every navigation.
 */
export const fetchRootData = createServerFn().handler(async () => ({
  theme: readThemeCookie(),
  navPages: await navPages(),
}))
