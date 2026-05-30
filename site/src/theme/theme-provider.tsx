import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyResolvedTheme,
  writeThemeCookie,
  type ResolvedTheme,
  type Theme,
} from './theme'

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme | null
  children: ReactNode
}) {
  // `null` = no explicit choice yet; follow the OS preference.
  const [theme, setThemeState] = useState<Theme | null>(initialTheme)
  // Server can't resolve the OS preference; the no-flash script handles the first paint.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(initialTheme ?? 'light')

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    writeThemeCookie(next)
    setResolvedTheme(next)
    applyResolvedTheme(next)
  }, [])

  // Sync the document after hydration; while no explicit choice exists, follow the OS.
  useEffect(() => {
    if (theme) {
      setResolvedTheme(theme)
      applyResolvedTheme(theme)
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved: ResolvedTheme = media.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyResolvedTheme(resolved)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const value = useMemo(() => ({ resolvedTheme, setTheme }), [resolvedTheme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
