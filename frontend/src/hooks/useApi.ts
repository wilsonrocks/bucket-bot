import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { notifications } from '@mantine/notifications'

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
        name: string
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

export const useGetPlayersWithNoDiscordId = () => {
  const auth = useAuth()
  const playerRankings = useQuery({
    queryKey: ['players-with-no-discord-id'],
    enabled: !!auth,
    queryFn: async (): Promise<
      {
        player_id: number
        player_name: string
        longshanks_name: string
        longshanks_id: string
        results: { tourney_name: string; place: number; faction: string }[]
      }[]
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/players-with-no-discord-id`
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

export const useSearchDiscordUsers = (text: string) => {
  const auth = useAuth()
  const playerRankings = useQuery({
    queryKey: ['search-discord-users', text],
    enabled: !!auth,
    queryFn: async (): Promise<
      {
        discord_user_id: string
        discord_display_name: string
        discord_nickname: string
        discord_avatar_url: string
        created_at: string
        discord_username: string
      }[]
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/search-discord-users?text=${encodeURIComponent(text)}`
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

export const useMatchPlayerToDiscordUser = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['players-with-no-discord-id'],
      })
      queryClient.invalidateQueries({
        queryKey: ['search-discord-users'],
      })
    },
    mutationFn: async ({
      playerId,
      discordUserId,
    }: {
      playerId: number
      discordUserId: string
    }) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/match-player-to-discord-user/${playerId}/${discordUserId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Error matching player to Discord user:', errorData)
        notifications.show({
          title: 'Error',
          message: `Failed to match player to Discord user: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to match player to Discord user')
      }
      return res.json()
    },
  })
  return mutation
}

export const useFetchDiscordUsersMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['players-with-no-discord-id'],
      })
      queryClient.invalidateQueries({
        queryKey: ['search-discord-users'],
      })
    },
    mutationFn: async () => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/fetch-discord-user-ids`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Error fetching Discord user IDs:', errorData)
        notifications.show({
          title: 'Error',
          message: `Failed to fetch Discord user IDs: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch Discord user IDs')
      }
      return res.json()
    },
  })
  return mutation
}

export const usePostRankingsToDiscordMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Rankings have been posted to Discord successfully.',
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('Error posting rankings to Discord:', error)
      notifications.show({
        title: 'Error',
        message: `Failed to post rankings to Discord: ${error.message || 'Unknown error'}`,
        color: 'red',
      })
    },
    mutationFn: async () => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/post-discord-rankings`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Error posting rankings to Discord:', errorData)
        notifications.show({
          title: 'Error',
          message: `Failed to post rankings to Discord: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to post rankings to Discord')
      }
      return res.json()
    },
  })
  return mutation
}
