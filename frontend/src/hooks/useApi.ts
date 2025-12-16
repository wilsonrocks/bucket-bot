import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export const useHasRole = () => {
  const auth = useAuth()
  const hasRole = useQuery({
    queryKey: ['has-role'],
    queryFn: async (): Promise<{ rankingReporter: boolean }> => {
      if (!auth) {
        throw new Error('No auth available')
      }
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/has-role`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${auth.jwt}`,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch role information')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!auth) return null
  return hasRole.data?.rankingReporter ?? false
}
