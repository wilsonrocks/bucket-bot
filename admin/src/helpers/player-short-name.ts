interface PlayerShortNameArgs {
  name: string
  short_name: string | null
}

export function playerShortName({
  name,
  short_name,
}: PlayerShortNameArgs): string {
  if (short_name) return short_name
  const words = name.split(' ')
  if (words.length === 1) return words[0].slice(0, 10)
  return words[0].slice(0, 9) + ' ' + words[1].slice(0, 1)
}
