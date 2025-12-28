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
        localStorage.clear()
        throw new Error('Failed to fetch role information')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!auth) return null
  return hasRole.data?.rankingReporter ?? false
}

export const useGenerateRankingsSnapshotMutation = () => {
  const auth = useAuth()

  const mutation = useMutation({
    mutationFn: async () => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/generate-rankings`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error('Failed to generate rankings snapshot')
      }
      return res.json()
    },
  })
  return mutation
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

export const useGetRankingTypes = () => {
  const auth = useAuth()
  const allTourneys = useQuery({
    queryKey: ['all-ranking-types'],
    enabled: !!auth,
    queryFn: async (): Promise<
      Array<{
        code: string
        description: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/ranking-types`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch ranking types')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetRankings = (typeCode: string | undefined) => {
  const auth = useAuth()
  const allTourneys = useQuery({
    queryKey: ['rankings', typeCode],
    enabled: !!auth,
    queryFn: async (): Promise<
      Array<{
        batch_id: number
        player_id: number
        rank: number
        total_points: number
        id: number
        name: string
      }>
    > => {
      if (!typeCode) {
        return []
      }
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/rankings/${typeCode}`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch ranking types')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetRankingsForPlayer = (playerId: number, typeCode: string) => {
  const auth = useAuth()
  const playerRankings = useQuery({
    queryKey: ['rankings-player', playerId, typeCode],
    enabled: !!auth,
    queryFn: async (): Promise<{
      metadata: { number_of_players: number }
      rankings: {
        batch_id: number
        created_at: string
        rank: number
        total_points: number
        name: string
      }[]
    }> => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/rankings/${playerId}/${typeCode}`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch player rankings')
      }
      return res.json()
    },
  })
  return playerRankings
}
