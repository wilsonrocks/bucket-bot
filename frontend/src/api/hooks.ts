// TODO what is with all this as 200s what if these endpoints fail

import { useQueryClient } from '@tanstack/react-query'
import {
  useGetAllDiscordUsers as useGetAllDiscordUsersGenerated,
  useGetBotChatChannels as useGetBotChatChannelsGenerated,
  useGetFactionRankings as useGetFactionRankingsGenerated,
  useGetFactionsOverTime as useGetFactionsOverTimeGenerated,
  useGetPlayersOverTimeTypeCode as useGetPlayersOverTimeTypeCodeGenerated,
  useGetHasRole as useGetHasRoleGenerated,
  useGetPlayerId as useGetPlayerIdGenerated,
  useGetPlayers as useGetPlayersGenerated,
  useGetRankingsPlayerIdTypeCode as useGetRankingsPlayerIdTypeCodeGenerated,
  useGetRankingsTypeCode as useGetRankingsTypeCodeGenerated,
  useGetRankingTypes as useGetRankingTypesGenerated,
  useGetSearchDiscordUsers as useGetSearchDiscordUsersGenerated,
  useGetTeams as useGetTeamsGenerated,
  useGetTeamsId as useGetTeamsIdGenerated,
  useGetTiers as useGetTiersGenerated,
  useGetTourney as useGetTourneyGenerated,
  useGetTourneyId as useGetTourneyIdGenerated,
  useGetTourneysPlayerPlayerId as useGetTourneysPlayerPlayerIdGenerated,
  useGetUnmappedIdentities as useGetUnmappedIdentitiesGenerated,
  useGetVenues as useGetVenuesGenerated,
  usePostBotEventId as usePostBotEventIdGenerated,
  usePostCreateTeam as usePostCreateTeamGenerated,
  usePostCreateVenue as usePostCreateVenueGenerated,
  usePostFetchDiscordUserIds as usePostFetchDiscordUserIdsGenerated,
  usePostLongshanksEventId as usePostLongshanksEventIdGenerated,
  usePostMatchPlayerToDiscordUser as usePostMatchPlayerToDiscordUserGenerated,
  usePostPostDiscordEventTourneyId as usePostPostDiscordEventTourneyIdGenerated,
  usePostTeamsTeamIdMembers as usePostTeamsTeamIdMembersGenerated,
  usePostTourney as usePostTourneyGenerated,
  usePutTeamsId as usePutTeamsIdGenerated,
  useDeleteTeamsId as useDeleteTeamsIdGenerated,
  usePatchTeamsTeamIdMembersMembershipId as usePatchTeamsTeamIdMembersMembershipIdGenerated,
  useDeleteTeamsTeamIdMembersMembershipId as useDeleteTeamsTeamIdMembersMembershipIdGenerated,
  usePutPlayerId as usePutPlayerIdGenerated,
  useGetPlayerNameExistsPlayerId as useGetPlayerNameExistsPlayerIdGenerated,
  useGetPlayerIdTeams as useGetPlayerIdTeamsGenerated,
  getGetTourneyQueryKey,
  getGetTourneyIdQueryKey,
  getGetUnmappedIdentitiesQueryKey,
  getGetVenuesQueryKey,
  getGetTeamsQueryKey,
  getGetTeamsIdQueryKey,
  getGetPlayersQueryKey,
  getGetPlayerIdQueryKey,
  getGetPlayerNameExistsPlayerIdQueryKey,
} from './generated/default/default'

import type {
  GetSearchDiscordUsersParams,
  GetSearchDiscordUsers200Item,
  GetRankingsPlayerIdTypeCode200,
  GetTourneysPlayerPlayerId200Item,
  GetPlayerId200,
  GetHasRole200,
  GetPlayerNameExistsPlayerId200,
  GetPlayerIdTeams200Item,
} from './generated/bucketBotAPI.schemas'

// ── Re-export simple mutations (no invalidation needed) ────────────────────
export {
  usePostBotChatClearTestChannel,
  usePostBotChatPostMessage,
  usePostFactionRankings,
  usePostGenerateRankings,
  usePostPostDiscordRankings,
  usePostPostFactionRankings,
  usePostToken,
} from './generated/default/default'

// ── Re-export all schema types ─────────────────────────────────────────────
export type * from './generated/bucketBotAPI.schemas'

// ── Query hooks (wrapped with select to unwrap the response envelope) ──────

export const useGetVenues = (
  options?: Parameters<typeof useGetVenuesGenerated>[0],
) =>
  useGetVenuesGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetRankingTypes = (
  options?: Parameters<typeof useGetRankingTypesGenerated>[0],
) =>
  useGetRankingTypesGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetTourney = (
  options?: Parameters<typeof useGetTourneyGenerated>[0],
) =>
  useGetTourneyGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetPlayers = (
  options?: Parameters<typeof useGetPlayersGenerated>[0],
) =>
  useGetPlayersGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetTiers = (
  options?: Parameters<typeof useGetTiersGenerated>[0],
) =>
  useGetTiersGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetFactionRankings = (
  options?: Parameters<typeof useGetFactionRankingsGenerated>[0],
) =>
  useGetFactionRankingsGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetFactionsOverTime = (
  options?: Parameters<typeof useGetFactionsOverTimeGenerated>[0],
) =>
  useGetFactionsOverTimeGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetPlayersOverTimeTypeCode = (
  typeCode: string,
  options?: Parameters<typeof useGetPlayersOverTimeTypeCodeGenerated>[1],
) =>
  useGetPlayersOverTimeTypeCodeGenerated(typeCode, {
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetBotChatChannels = (
  options?: Parameters<typeof useGetBotChatChannelsGenerated>[0],
) =>
  useGetBotChatChannelsGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetAllDiscordUsers = (
  options?: Parameters<typeof useGetAllDiscordUsersGenerated>[0],
) =>
  useGetAllDiscordUsersGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetUnmappedIdentities = (
  options?: Parameters<typeof useGetUnmappedIdentitiesGenerated>[0],
) =>
  useGetUnmappedIdentitiesGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetHasRole = (
  options?: Parameters<typeof useGetHasRoleGenerated>[0],
) =>
  useGetHasRoleGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data as GetHasRole200 },
  })

export const useGetTourneyId = (
  id: string,
  options?: Parameters<typeof useGetTourneyIdGenerated>[1],
) =>
  useGetTourneyIdGenerated(id, {
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetPlayerId = (
  id: string,
  options?: Parameters<typeof useGetPlayerIdGenerated>[1],
) =>
  useGetPlayerIdGenerated(id, {
    ...options,
    query: { ...options?.query, select: (res) => res.data as GetPlayerId200 },
  })

export const useGetPlayerIdTeams = (
  id: string,
  options?: Parameters<typeof useGetPlayerIdTeamsGenerated>[1],
) =>
  useGetPlayerIdTeamsGenerated(id, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => res.data as GetPlayerIdTeams200Item[],
    },
  })

export const useGetPlayerNameExistsPlayerId = (
  playerId: Parameters<typeof useGetPlayerNameExistsPlayerIdGenerated>[0],
  params: Parameters<typeof useGetPlayerNameExistsPlayerIdGenerated>[1],
  options?: Parameters<typeof useGetPlayerNameExistsPlayerIdGenerated>[2],
) =>
  useGetPlayerNameExistsPlayerIdGenerated(playerId, params, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => res.data as GetPlayerNameExistsPlayerId200,
    },
  })

export const usePutPlayerId = (id: number) => {
  const queryClient = useQueryClient()
  return usePutPlayerIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdQueryKey(String(id)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerNameExistsPlayerIdQueryKey(String(id)),
        })
      },
    },
  })
}

export const useGetTourneysPlayerPlayerId = (
  playerId: string,
  options?: Parameters<typeof useGetTourneysPlayerPlayerIdGenerated>[1],
) =>
  useGetTourneysPlayerPlayerIdGenerated(playerId, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => res.data as GetTourneysPlayerPlayerId200Item[],
    },
  })

export const useGetRankingsTypeCode = (
  typeCode: string,
  options?: Parameters<typeof useGetRankingsTypeCodeGenerated>[1],
) =>
  useGetRankingsTypeCodeGenerated(typeCode, {
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetRankingsPlayerIdTypeCode = (
  playerId: string,
  typeCode: string,
  options?: Parameters<typeof useGetRankingsPlayerIdTypeCodeGenerated>[2],
) =>
  useGetRankingsPlayerIdTypeCodeGenerated(playerId, typeCode, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => res.data as GetRankingsPlayerIdTypeCode200,
    },
  })

export const useGetSearchDiscordUsers = (
  params: GetSearchDiscordUsersParams,
  options?: Parameters<typeof useGetSearchDiscordUsersGenerated>[1],
) =>
  useGetSearchDiscordUsersGenerated(params, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => res.data as GetSearchDiscordUsers200Item[],
    },
  })

// ── Wrapped mutations with query invalidation ──────────────────────────────

export const usePostLongshanksEventId = () => {
  const queryClient = useQueryClient()
  return usePostLongshanksEventIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTourneyQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const usePostBotEventId = () => {
  const queryClient = useQueryClient()
  return usePostBotEventIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTourneyQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const usePostCreateVenue = () => {
  const queryClient = useQueryClient()
  return usePostCreateVenueGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVenuesQueryKey() })
      },
    },
  })
}

export const usePostFetchDiscordUserIds = () => {
  const queryClient = useQueryClient()
  return usePostFetchDiscordUserIdsGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['/v1/search-discord-users'],
        })
      },
    },
  })
}

export const usePostMatchPlayerToDiscordUser = () => {
  const queryClient = useQueryClient()
  return usePostMatchPlayerToDiscordUserGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['/v1/search-discord-users'],
        })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const usePostTourney = (id: number) => {
  const queryClient = useQueryClient()
  return usePostTourneyGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetTourneyIdQueryKey(String(id)),
        })
      },
    },
  })
}

export const usePostPostDiscordEventTourneyId = () => {
  const queryClient = useQueryClient()
  return usePostPostDiscordEventTourneyIdGenerated({
    mutation: {
      onSuccess: (_, { tourneyId }) => {
        queryClient.invalidateQueries({
          queryKey: getGetTourneyIdQueryKey(tourneyId),
        })
      },
    },
  })
}

// ── Teams ──────────────────────────────────────────────────────────────────

export const useGetTeams = (
  options?: Parameters<typeof useGetTeamsGenerated>[0],
) =>
  useGetTeamsGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetTeamsId = (
  id: string,
  options?: Parameters<typeof useGetTeamsIdGenerated>[1],
) =>
  useGetTeamsIdGenerated(id, {
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const usePostCreateTeam = () => {
  const queryClient = useQueryClient()
  return usePostCreateTeamGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTeamsQueryKey() })
      },
    },
  })
}

export const usePutTeamsId = (id: number) => {
  const queryClient = useQueryClient()
  return usePutTeamsIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTeamsQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetTeamsIdQueryKey(String(id)),
        })
      },
    },
  })
}

export const useDeleteTeamsId = () => {
  const queryClient = useQueryClient()
  return useDeleteTeamsIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTeamsQueryKey() })
      },
    },
  })
}

export const usePostTeamsTeamIdMembers = (teamId: number) => {
  const queryClient = useQueryClient()
  return usePostTeamsTeamIdMembersGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetTeamsIdQueryKey(String(teamId)),
        })
      },
    },
  })
}

export const usePatchTeamsTeamIdMembersMembershipId = (teamId: number) => {
  const queryClient = useQueryClient()
  return usePatchTeamsTeamIdMembersMembershipIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetTeamsIdQueryKey(String(teamId)),
        })
      },
    },
  })
}

export const useDeleteTeamsTeamIdMembersMembershipId = (teamId: number) => {
  const queryClient = useQueryClient()
  return useDeleteTeamsTeamIdMembersMembershipIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetTeamsIdQueryKey(String(teamId)),
        })
      },
    },
  })
}

export const uploadTeamImage = async (
  file: File,
  type: string,
): Promise<string> => {
  const stored = localStorage.getItem('auth')
  const jwt = stored ? (JSON.parse(stored) as { jwt: string }).jwt : null
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}/v1/upload?type=${encodeURIComponent(type)}`,
    {
      method: 'POST',
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      body: formData,
    },
  )
  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`)
  const { key } = (await response.json()) as { key: string }
  return key
}
