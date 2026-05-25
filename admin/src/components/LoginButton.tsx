import { useAuth } from '@/hooks/useAuth'
import { Anchor, Box, Button, Group } from '@mantine/core'
import { IconBrandDiscord } from '@tabler/icons-react'

export const LoginButton = () => {
  return (
    <Button
      onClick={() => {
        const redirectUri = new URL(
          '/logged-in',
          window.location.origin,
        ).toString()
        const params = new URLSearchParams({
          client_id: '1447679317302837411', // TODO move to an env var
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'identify',
        })
        window.location.assign(
          `${import.meta.env.VITE_DISCORD_LOGIN_URL}?${params.toString()}`,
        )
      }}
    >
      <Group gap="xs">
        <IconBrandDiscord />
        Login with Discord
      </Group>
    </Button>
  )
}

export const LogoutButton = () => {
  const auth = useAuth()
  if (!auth) return null
  return (
    <Box>
      Hi, <strong>{auth.global_name ?? auth.username}</strong>{' '}
      <Anchor onClick={auth.logout}>logout</Anchor>
    </Box>
  )
}
