/** WCAG relative luminance of a #rrggbb colour, or null if it isn't one. */
export function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Black-ish or white text, whichever reads better on `hex` (e.g. a faction
 * colour). Falls back to `fallback` for anything that isn't a hex colour.
 */
export function textOn(hex: string, fallback = '#ffffff'): string {
  const l = luminance(hex)
  if (l === null) return fallback
  return l > 0.4 ? '#15110e' : '#ffffff'
}
