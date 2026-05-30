interface TeamAvatarProps {
  image_key: string | null | undefined
  name: string
  size?: number
}

export function TeamAvatar({ image_key, name, size = 35 }: TeamAvatarProps) {
  const base = image_key
    ? `${import.meta.env.VITE_ASSETS_URL}/${image_key}`
    : null

  if (base) {
    return (
      <img
        src={`${base}-w35.webp`}
        srcSet={`${base}-w35.webp 1x, ${base}-w150.webp 2x`}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-sm object-contain"
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="inline-flex items-center justify-center rounded-sm bg-muted font-medium text-foreground"
      aria-label={name}
    >
      {name[0]}
    </div>
  )
}
