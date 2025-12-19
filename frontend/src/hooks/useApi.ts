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

export const useGetAllTourneys = () => {
  const auth = useAuth()
  const allTourneys = useQuery({
    queryKey: ['all-tourneys'],
    enabled: !!auth,
    queryFn: async (): Promise<
      Array<{
        id: number
        name: string
        date: string
        venue: string
        level_code: string
        longshanks_id: number | null
        players: number
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tourney`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch tourneys')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetTourneyDetail = (id: number) => {
  const auth = useAuth()
  const tourneyDetail = useQuery({
    queryKey: ['tourney-detail', 'id'],
    enabled: !!auth,
    queryFn: async (): Promise<{
      tourney: {
        id: number
        name: string
        date: string
        venue: string
        level_code: string
      }
      players: {
        playerId: number
        factionName: string
        playerName: string
        place: number
        points: number
      }[]
    }> => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tourney/${id}`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch tourney detail')
      }
      return res.json()
    },
  })
  return tourneyDetail
}
