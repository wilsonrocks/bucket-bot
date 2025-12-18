import { useLocalStorage } from '@mantine/hooks'

export const useAuth = () => {
  const [authData, setAuthData] = useLocalStorage<
    | {
        jwt: string
        username: string
        global_name: string
      }
    | undefined
  >({ key: 'auth' })

  if (!authData) return null
  return {
    ...authData,
    logout: () => setAuthData(undefined),
    headers: {
      Authorization: `Bearer ${authData.jwt}`,
    },
  }
}
