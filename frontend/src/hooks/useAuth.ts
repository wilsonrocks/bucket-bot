import { useLocalStorage } from '@mantine/hooks'
import { Route as HomeRoute } from '../routes/index'

export const useAuth = () => {
  const navigate = HomeRoute.useNavigate()
  const [authData, _setAuthData, removeAuthData] = useLocalStorage<
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
    logout: () => {
      removeAuthData()
      navigate({})
    },
    headers: {
      Authorization: `Bearer ${authData.jwt}`,
    },
  }
}
