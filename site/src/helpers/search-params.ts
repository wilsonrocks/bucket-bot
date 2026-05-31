// Tiny typed coercion helpers for TanStack Router `validateSearch` / `params`,
// replacing client-side zod (which bloated the shared bundle by ~270KB).

/** A non-empty string, or undefined. */
export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** A non-empty string, or the provided fallback. */
export function stringWithDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/** A finite number coerced from the raw value, or undefined. */
export function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

/** The value if it is one of `allowed`, otherwise undefined. */
export function enumParam<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}
