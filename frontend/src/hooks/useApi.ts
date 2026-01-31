import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  const allTourneys = useQuery({
    queryKey: ['all-tourneys'],
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
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch tourneys')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetTourneyDetail = (id: number) => {
  const tourneyDetail = useQuery({
    queryKey: ['tourney-detail', 'id'],
    queryFn: async (): Promise<{
      tourney: {
        id: number
        name: string
        date: string
        venue: string
        tier_code: string
        days: number | null
        rounds: number | null
        organiser_discord_id: string | null
        venue_id: number | null
        discord_post_id: number | null
      }
      players: {
        factionHexCode: string
        playerId: number
        factionName: string
        playerName: string
        place: number
        points: number
      }[]
      paintingCategories: {
        name: string
        winners: { player_id: number; position: number; model: string }[]
      }[]
    }> => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tourney/${id}`
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch tourney detail')
      }
      return res.json()
    },
  })
  return tourneyDetail
}

export const useGetRankingTypes = () => {
  const allTourneys = useQuery({
    queryKey: ['all-ranking-types'],
    queryFn: async (): Promise<
      Array<{
        code: string
        name: string
        description: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/ranking-types`
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch ranking types')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetRankings = (typeCode: string | undefined) => {
  const allTourneys = useQuery({
    queryKey: ['rankings', typeCode],
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
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch ranking types')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetRankingsForPlayer = (
  playerId: number,
  typeCode: string | undefined,
) => {
  const playerRankings = useQuery({
    queryKey: ['rankings-player', playerId, typeCode],
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
      if (!typeCode) {
        return { metadata: { number_of_players: 0 }, rankings: [] }
      }
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/rankings/${playerId}/${typeCode}`
      const res = await fetch(url, {})
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

export const useGetDiscordBotChannels = () => {
  const auth = useAuth()
  const botChannels = useQuery({
    queryKey: ['discord-bot-channels'],
    enabled: !!auth,
    queryFn: async (): Promise<
      Array<{
        id: string
        name: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/bot-chat/channels`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        throw new Error('Failed to fetch Discord bot channels')
      }
      return res.json()
    },
  })
  return botChannels
}

export const usePostMessageToDiscordChannel = () => {
  const auth = useAuth()
  const mutation = useMutation({
    mutationFn: async (data: { channelId: string; message: string }) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/bot-chat/post-message`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        notifications.show({
          title: 'Error',
          message: `Failed to post message to Discord channel: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        console.error('Error posting message to Discord channel:', errorData)
        throw new Error('Failed to post message to Discord channel')
      }
      notifications.show({
        title: 'Success',
        message: `Posted ${data.message}`,
        color: 'green',
      })
      return res.json()
    },
  })
  return mutation
}

export const useGetVenues = () => {
  const auth = useAuth()
  const venues = useQuery({
    queryKey: ['venues'],
    enabled: !!auth,
    queryFn: async (): Promise<
      Array<{
        id: number
        name: string
        town: string
        post_code: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/venues`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to fetch venues: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch venues')
      }
      return res.json()
    },
  })
  return venues
}

export const useCreateVenueMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['venues'],
      })
      notifications.show({
        title: 'Success',
        message: 'Venue created successfully.',
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('Error creating venue:', error)
      notifications.show({
        title: 'Error',
        message: `Failed to create venue: ${error.message || 'Unknown error'}`,
        color: 'red',
      })
    },
    mutationFn: async (data: {
      name: string
      town: string
      postCode: string
    }) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/create-venue`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          town: data.town,
          postCode: data.postCode,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Error creating venue:', errorData)
        notifications.show({
          title: 'Error',
          message: `Failed to create venue: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to create venue')
      }
      return res.json()
    },
  })
  return mutation
}

export const useGetPlayerById = (playerId: number) => {
  const playerData = useQuery({
    queryKey: ['player-by-id', playerId],
    queryFn: async (): Promise<{
      id: number
      name: string
      discord_user_id: string | null
      longshanks_id: number | null
      longshanks_name: string | null
    }> => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/player/${playerId}`
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch player data')
      }
      return res.json()
    },
  })
  return playerData
}

export const useGetTourneysForPlayer = (playerId: number) => {
  const allTourneys = useQuery({
    queryKey: ['tourneys-for-player', playerId],
    queryFn: async (): Promise<
      Array<{
        tourneyId: number
        tourneyName: string
        tourneyDate: string
        tourneyVenue: string
        tourneyTierCode: string
        place: number
        points: number
        factionName: string
        date: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tourneys/player/${playerId}`
      const res = await fetch(url, {})
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to fetch tourneys for player: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch tourneys for player')
      }
      return res.json()
    },
  })
  return allTourneys
}

export const useGetPlayers = () => {
  const allPlayers = useQuery({
    queryKey: ['players'],
    queryFn: async (): Promise<
      Array<{
        id: number
        name: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/players`
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch players')
      }
      return res.json()
    },
  })
  return allPlayers
}

export const useUpdateTourneyMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tourney-detail', variables.id],
      })
      notifications.show({
        title: 'Success',
        message: 'Tourney updated successfully.',
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('Error updating tourney:', error)
      notifications.show({
        title: 'Error',
        message: `Failed to update tourney - check console for details`,
        color: 'red',
      })
    },
    mutationFn: async (data: {
      id: number
      organiserDiscordId?: string
      venueId?: number
      name: string
      rounds: number
      days: number
      tierCode: string
      // paintingCategories: {
      //   name: string
      //   winners: { playerId: number; model: string }[]
      // }[]
    }) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tourney`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: data.id,
          organiserDiscordId: data.organiserDiscordId,
          venueId: data.venueId,
          name: data.name,
          rounds: data.rounds,
          days: data.days,
          // paintingCategories: data.paintingCategories,
          tierCode: data.tierCode,
        }),
      })
      if (!res.ok) {
        throw new Error(await res.json())
      }
      return res.json()
    },
  })
  return mutation
}

export const useGetTiers = () => {
  const tiers = useQuery({
    queryKey: ['tiers'],
    queryFn: async (): Promise<
      Array<{
        code: string
        name: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/tiers`
      const res = await fetch(url, {})
      if (!res.ok) {
        throw new Error('Failed to fetch tiers')
      }
      return res.json()
    },
  })
  return tiers
}

export const usePostEventToDiscordMutation = () => {
  const auth = useAuth()
  const mutation = useMutation({
    mutationFn: async (eventId: number) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/post-discord-event/${eventId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        notifications.show({
          title: 'Error',
          message: `Failed to post event to Discord: ${errorData.message || res.statusText}`,
          color: 'red',
        })
        console.error('Error posting event to Discord:', errorData)
        throw new Error('Failed to post event to Discord')
      }
      notifications.show({
        title: 'Success',
        message: `Event posted to Discord successfully.`,
        color: 'green',
      })
      return res.json()
    },
  })
  return mutation
}

export const useGenerateFactionRankingsMutation = () => {
  const auth = useAuth()

  const mutation = useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Faction rankings generated successfully.',
        color: 'green',
      })
      const queryClient = useQueryClient()
      queryClient.invalidateQueries({
        queryKey: ['faction-rankings'],
      })
    },
    mutationFn: async () => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/faction-rankings`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to generate faction rankings: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to generate faction rankings')
      }
      return res.json()
    },
  })
  return mutation
}

export const useGetFactionRankings = () => {
  const factionRankings = useQuery({
    queryKey: ['faction-rankings'],
    queryFn: async (): Promise<
      Array<{
        snapshot_date: string
        faction_name: string
        rank: number
        faction_code: string
        total_points: number
        declarations: number
        points_per_declaration: number
        hex_code: string
      }>
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/faction-rankings`
      const res = await fetch(url, {})
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to fetch faction rankings: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch faction rankings')
      }
      return res.json()
    },
  })
  return factionRankings
}

export const usePostFactionRankingsToDiscordMutation = () => {
  const auth = useAuth()
  const mutation = useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Faction rankings have been posted to Discord successfully.',
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('Error posting faction rankings to Discord:', error)
      notifications.show({
        title: 'Error',
        message: `Failed to post faction rankings to Discord: ${error.message || 'Unknown error'}`,
        color: 'red',
      })
    },
    mutationFn: async (live: boolean) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/post-faction-rankings${live ? '?live=true' : ''}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(
          `Failed to post faction rankings to Discord: ${res.statusText}`,
        )
      }
    },
  })
  return mutation
}

export const useGetAllDiscordUsers = () => {
  const auth = useAuth()
  const allDiscordUsers = useQuery({
    queryKey: ['all-discord-users'],
    enabled: !!auth,

    queryFn: async (): Promise<
      {
        discord_user_id: string
        discord_display_name: string
        discord_nickname: string
        discord_avatar_url: string
        created_at: string
        discord_username: string
        name: string | null
        longshanks_name: string | null
      }[]
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/all-discord-users`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to fetch all discord users: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch all discord users')
      }
      return res.json()
    },
  })
  return allDiscordUsers
}

export const useCreateBotEventMutation = () => {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['events', 'unmapped-identities'],
      })
      notifications.show({
        title: 'Success',
        message: 'BOT Event created successfully.',
        color: 'green',
      })
    },
    onError: (error: any) => {
      console.error('Error creating BOT event:', error)
      notifications.show({
        title: 'Error',
        message: `Failed to create BOT event - check console for details`,
        color: 'red',
      })
    },
    mutationFn: async (data: {
      eventId: string
      eventName: string
      organiserDiscordId: string
      venueId: number | null
      rounds: number | null
      days: number | null
      tier: string
      dateString: string
      results: Array<{
        name: string
        place: number
        played: number
        faction: string
      }>
    }) => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/bot-event`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...auth!.headers, // is checked on use
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        throw new Error(await res.json())
      }
    },
  })
  return mutation
}

export const useGetUnmappedIdentities = () => {
  const auth = useAuth()
  const unmappedIdentities = useQuery({
    queryKey: ['unmapped-identities'],
    enabled: !!auth,
    queryFn: async (): Promise<
      {
        player_identity_id: number
        external_id: string
        name: string
        provider_name: string
        provider_id: string
        results: Array<{
          tourney_id: number
          tourney_name: string
          place: number
          faction: string
        }>
      }[]
    > => {
      const url = `${import.meta.env.VITE_BACKEND_URL}/v1/unmapped-identities`
      const res = await fetch(url, {
        headers: auth!.headers, // is checked on enabled
      })
      if (!res.ok) {
        notifications.show({
          title: 'Error',
          message: `Failed to fetch unmapped identities: ${res.statusText}`,
          color: 'red',
        })
        throw new Error('Failed to fetch unmapped identities')
      }
      return res.json()
    },
  })
  return unmappedIdentities
}
