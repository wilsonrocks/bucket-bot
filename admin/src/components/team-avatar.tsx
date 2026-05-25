import { Avatar } from '@mantine/core'

interface TeamAvatarProps {
  image_key: string | null | undefined
  name: string
  size?: number
}

export function TeamAvatar({ image_key, name, size = 35 }: TeamAvatarProps) {
  return (
    <Avatar
      src={
        image_key
          ? `${import.meta.env.VITE_ASSETS_URL}/${image_key}-w150.png`
          : null
      }
      alt={name}
      size={size}
      radius="sm"
      styles={{ image: { objectFit: 'contain' } }}
    >
      {name[0]}
    </Avatar>
  )
}
