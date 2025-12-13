import { Anchor, Box, Button } from '@mantine/core'
import { useAuth } from '@/hooks/useAuth'

export const LoginButton = () => {
  const auth = useAuth()

  if (!auth)
    return (
      <Button
        onClick={() => {
          const redirectUri = new URL(
            '/logged-in',
            window.location.origin,
          ).toString()
          const params = new URLSearchParams({
            client_id: '1447679317302837411',
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: 'identify',
          })
          window.location.assign(
            `${import.meta.env.VITE_DISCORD_LOGIN_URL}?${params.toString()}`,
          )
        }}
      >
        Login
      </Button>
    )

  return (
    <Box>
      {auth.global_name ?? auth.username}{' '}
      <Anchor onClick={auth.logout}>logout</Anchor>
    </Box>
  )
}
