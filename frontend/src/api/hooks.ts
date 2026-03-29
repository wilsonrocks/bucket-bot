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
  useGetTiers as useGetTiersGenerated,
  useGetTourney as useGetTourneyGenerated,
  useGetTourneyId as useGetTourneyIdGenerated,
  useGetTourneysPlayerPlayerId as useGetTourneysPlayerPlayerIdGenerated,
  useGetUnmappedIdentities as useGetUnmappedIdentitiesGenerated,
  useGetVenues as useGetVenuesGenerated,
  usePostBotEventId as usePostBotEventIdGenerated,
  usePostCreateVenue as usePostCreateVenueGenerated,
  usePostFetchDiscordUserIds as usePostFetchDiscordUserIdsGenerated,
  usePostLongshanksEventId as usePostLongshanksEventIdGenerated,
  usePostMatchPlayerToDiscordUser as usePostMatchPlayerToDiscordUserGenerated,
  usePostTourney as usePostTourneyGenerated,
  getGetTourneyQueryKey,
  getGetTourneyIdQueryKey,
  getGetUnmappedIdentitiesQueryKey,
  getGetVenuesQueryKey,
} from './generated/default/default'

import type {
  GetSearchDiscordUsersParams,
  GetSearchDiscordUsers200Item,
  GetRankingsPlayerIdTypeCode200,
  GetTourneysPlayerPlayerId200Item,
  GetPlayerId200,
  GetHasRole200,
} from './generated/bucketBotAPI.schemas'

// ── Re-export simple mutations (no invalidation needed) ────────────────────
export {
  usePostBotChatClearTestChannel,
  usePostBotChatPostMessage,
  usePostFactionRankings,
  usePostGenerateRankings,
  usePostPostDiscordEventTourneyId,
  usePostPostDiscordRankings,
  usePostPostFactionRankings,
  usePostToken,
} from './generated/default/default'

// ── Re-export all schema types ─────────────────────────────────────────────
export type * from './generated/bucketBotAPI.schemas'

// ── Query hooks (wrapped with select to unwrap the response envelope) ──────

export const useGetVenues = (options?: Parameters<typeof useGetVenuesGenerated>[0]) =>
  useGetVenuesGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetRankingTypes = (options?: Parameters<typeof useGetRankingTypesGenerated>[0]) =>
  useGetRankingTypesGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetTourney = (options?: Parameters<typeof useGetTourneyGenerated>[0]) =>
  useGetTourneyGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetPlayers = (options?: Parameters<typeof useGetPlayersGenerated>[0]) =>
  useGetPlayersGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetTiers = (options?: Parameters<typeof useGetTiersGenerated>[0]) =>
  useGetTiersGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetFactionRankings = (options?: Parameters<typeof useGetFactionRankingsGenerated>[0]) =>
  useGetFactionRankingsGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetFactionsOverTime = (options?: Parameters<typeof useGetFactionsOverTimeGenerated>[0]) =>
  useGetFactionsOverTimeGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetPlayersOverTimeTypeCode = (typeCode: string, options?: Parameters<typeof useGetPlayersOverTimeTypeCodeGenerated>[1]) =>
  useGetPlayersOverTimeTypeCodeGenerated(typeCode, { ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetBotChatChannels = (options?: Parameters<typeof useGetBotChatChannelsGenerated>[0]) =>
  useGetBotChatChannelsGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetAllDiscordUsers = (options?: Parameters<typeof useGetAllDiscordUsersGenerated>[0]) =>
  useGetAllDiscordUsersGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetUnmappedIdentities = (options?: Parameters<typeof useGetUnmappedIdentitiesGenerated>[0]) =>
  useGetUnmappedIdentitiesGenerated({ ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetHasRole = (options?: Parameters<typeof useGetHasRoleGenerated>[0]) =>
  useGetHasRoleGenerated({ ...options, query: { ...options?.query, select: (res) => res.data as GetHasRole200 } })

export const useGetTourneyId = (id: string, options?: Parameters<typeof useGetTourneyIdGenerated>[1]) =>
  useGetTourneyIdGenerated(id, { ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetPlayerId = (id: string, options?: Parameters<typeof useGetPlayerIdGenerated>[1]) =>
  useGetPlayerIdGenerated(id, { ...options, query: { ...options?.query, select: (res) => res.data as GetPlayerId200 } })

export const useGetTourneysPlayerPlayerId = (playerId: string, options?: Parameters<typeof useGetTourneysPlayerPlayerIdGenerated>[1]) =>
  useGetTourneysPlayerPlayerIdGenerated(playerId, { ...options, query: { ...options?.query, select: (res) => res.data as GetTourneysPlayerPlayerId200Item[] } })

export const useGetRankingsTypeCode = (typeCode: string, options?: Parameters<typeof useGetRankingsTypeCodeGenerated>[1]) =>
  useGetRankingsTypeCodeGenerated(typeCode, { ...options, query: { ...options?.query, select: (res) => res.data } })

export const useGetRankingsPlayerIdTypeCode = (playerId: string, typeCode: string, options?: Parameters<typeof useGetRankingsPlayerIdTypeCodeGenerated>[2]) =>
  useGetRankingsPlayerIdTypeCodeGenerated(playerId, typeCode, { ...options, query: { ...options?.query, select: (res) => res.data as GetRankingsPlayerIdTypeCode200 } })

export const useGetSearchDiscordUsers = (params: GetSearchDiscordUsersParams, options?: Parameters<typeof useGetSearchDiscordUsersGenerated>[1]) =>
  useGetSearchDiscordUsersGenerated(params, { ...options, query: { ...options?.query, select: (res) => res.data as GetSearchDiscordUsers200Item[] } })

// ── Wrapped mutations with query invalidation ──────────────────────────────

export const usePostLongshanksEventId = () => {
  const queryClient = useQueryClient()
  return usePostLongshanksEventIdGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTourneyQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetUnmappedIdentitiesQueryKey() })
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
        queryClient.invalidateQueries({ queryKey: getGetUnmappedIdentitiesQueryKey() })
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
        queryClient.invalidateQueries({ queryKey: ['/v1/search-discord-users'] })
      },
    },
  })
}

export const usePostMatchPlayerToDiscordUser = () => {
  const queryClient = useQueryClient()
  return usePostMatchPlayerToDiscordUserGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/v1/search-discord-users'] })
        queryClient.invalidateQueries({ queryKey: getGetUnmappedIdentitiesQueryKey() })
      },
    },
  })
}

export const usePostTourney = (id: number) => {
  const queryClient = useQueryClient()
  return usePostTourneyGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTourneyIdQueryKey(String(id)) })
      },
    },
  })
}
