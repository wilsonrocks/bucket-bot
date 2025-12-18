import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export const useHasRole = () => {
  const auth = useAuth()
  const hasRole = useQuery({
    queryKey: ['has-role'],
    enabled: !!auth,
    queryFn: async (): Promise<{ rankingReporter: boolean }> => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/has-role`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
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

export const useCreateLongshanksEventMutation = () => {
  const auth = useAuth()

  const mutation = useMutation({
    mutationFn: async (longshanksId: number) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/longshanks-event/${longshanksId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error('Failed to create Longshanks event')
      }
      return res.json()
    },
  })
  return mutation
}
