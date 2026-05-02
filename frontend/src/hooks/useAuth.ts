import { getGetFeatureFlagsQueryKey } from '@/api/generated/default/default'
import { getGetHasRoleQueryKey } from '@/api/generated/default/default'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalStorage } from '@mantine/hooks'
import { Route as HomeRoute } from '../routes/index'

export const useAuth = () => {
  const navigate = HomeRoute.useNavigate()
  const queryClient = useQueryClient()
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
      queryClient.invalidateQueries({ queryKey: getGetFeatureFlagsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getGetHasRoleQueryKey() })
      navigate({ search: { tab: undefined } })
    },
    headers: {
      Authorization: `Bearer ${authData.jwt}`,
    },
  }
}
