interface TeamAvatarProps {
  image_key: string | null | undefined
  name: string
  size?: number
}

export function TeamAvatar({ image_key, name, size = 35 }: TeamAvatarProps) {
  const src = image_key
    ? `${import.meta.env.VITE_ASSETS_URL}/${image_key}-w150.webp`
    : null

  if (src) {
    return (
      <img
        src={src}
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
