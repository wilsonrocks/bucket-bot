interface PlayerShortNameArgs {
  name: string
  short_name: string | null
}

export function playerShortName({
  name,
  short_name,
}: PlayerShortNameArgs): string {
  if (short_name) return short_name
  const firstWord = name.split(' ')[0]
  if (firstWord !== name) return firstWord
  return name.slice(0, 8)
}
