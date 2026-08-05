import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { customFetch } from './custom-instance'
import {
  getGetFeatureFlagsQueryKey,
  getGetPlayerIdQueryKey,
  getGetPlayerNameExistsPlayerIdQueryKey,
  getGetPlayersQueryKey,
  getGetTeamsIdQueryKey,
  getGetTeamsQueryKey,
  getGetTourneyIdQueryKey,
  getGetTourneyQueryKey,
  getGetUnmappedIdentitiesQueryKey,
  getGetUpcomingEventsQueryKey,
  getGetVenuesQueryKey,
  useDeleteTeamsId as useDeleteTeamsIdGenerated,
  useDeleteTeamsTeamIdMembersMembershipId as useDeleteTeamsTeamIdMembersMembershipIdGenerated,
  useGetAllDiscordUsers as useGetAllDiscordUsersGenerated,
  useGetBotChatChannels as useGetBotChatChannelsGenerated,
  useGetFactionRankings as useGetFactionRankingsGenerated,
  useGetFactionsOverTime as useGetFactionsOverTimeGenerated,
  useGetHasRole as useGetHasRoleGenerated,
  useGetPlayerId as useGetPlayerIdGenerated,
  getGetPlayerIdIdentitiesQueryKey,
  useGetPlayerIdIdentities as useGetPlayerIdIdentitiesGenerated,
  useGetPlayerIdPaintingWins as useGetPlayerIdPaintingWinsGenerated,
  useGetPlayerIdTeams as useGetPlayerIdTeamsGenerated,
  useGetPlayerNameExistsPlayerId as useGetPlayerNameExistsPlayerIdGenerated,
  useGetPlayers as useGetPlayersGenerated,
  useGetPlayersOverTimeTypeCode as useGetPlayersOverTimeTypeCodeGenerated,
  useGetTeamsOverTimeTypeCode as useGetTeamsOverTimeTypeCodeGenerated,
  useGetRankingsPlayerIdTypeCode as useGetRankingsPlayerIdTypeCodeGenerated,
  useGetRankingsTypeCode as useGetRankingsTypeCodeGenerated,
  useGetTeamRankingsTypeCode as useGetTeamRankingsTypeCodeGenerated,
  useGetFeatureFlags as useGetFeatureFlagsGenerated,
  useGetRankingTypes as useGetRankingTypesGenerated,
  useGetPipelineJobSteps as useGetPipelineJobStepsGenerated,
  useGetSearchDiscordUsers as useGetSearchDiscordUsersGenerated,
  useGetSearchPlayers as useGetSearchPlayersGenerated,
  usePostPlayerIdentityIdMergeIntoPlayer as usePostPlayerIdentityIdMergeIntoPlayerGenerated,
  useGetTeams as useGetTeamsGenerated,
  useGetTeamsId as useGetTeamsIdGenerated,
  useGetTiers as useGetTiersGenerated,
  useGetTourney as useGetTourneyGenerated,
  useGetTourneyId as useGetTourneyIdGenerated,
  useGetTourneysPlayerPlayerId as useGetTourneysPlayerPlayerIdGenerated,
  useGetUnmappedIdentities as useGetUnmappedIdentitiesGenerated,
  useGetUpcomingEvents as useGetUpcomingEventsGenerated,
  usePutUpcomingEventsIdVenue as usePutUpcomingEventsIdVenueGenerated,
  usePutUpcomingEventsIdOrganiser as usePutUpcomingEventsIdOrganiserGenerated,
  usePostSyncUpcomingEvents as usePostSyncUpcomingEventsGenerated,
  useGetVenues as useGetVenuesGenerated,
  usePatchTeamsTeamIdMembersMembershipId as usePatchTeamsTeamIdMembersMembershipIdGenerated,
  usePostBotEventId as usePostBotEventIdGenerated,
  usePostCreateTeam as usePostCreateTeamGenerated,
  usePostCreateVenue as usePostCreateVenueGenerated,
  usePostFetchDiscordUserIds as usePostFetchDiscordUserIdsGenerated,
  usePostLongshanksEventId as usePostLongshanksEventIdGenerated,
  useDeletePlayerIdDiscordUser as useDeletePlayerIdDiscordUserGenerated,
  useDeletePlayerIdentityIdPlayer as useDeletePlayerIdentityIdPlayerGenerated,
  usePostMatchPlayerToDiscordUser as usePostMatchPlayerToDiscordUserGenerated,
  usePostPlayerIdentityIdIgnore as usePostPlayerIdentityIdIgnoreGenerated,
  usePostPlayerIdMatchDiscordUser as usePostPlayerIdMatchDiscordUserGenerated,
  usePostPlayerIdMergeIntoPlayer as usePostPlayerIdMergeIntoPlayerGenerated,
  usePostPostDiscordEventTourneyId as usePostPostDiscordEventTourneyIdGenerated,
  usePostTeamsTeamIdMembers as usePostTeamsTeamIdMembersGenerated,
  usePostTourney as usePostTourneyGenerated,
  usePutPlayerId as usePutPlayerIdGenerated,
  usePutTeamsId as usePutTeamsIdGenerated,
  useGetPaintingAll as useGetPaintingAllGenerated,
  useGetPaintingRecent as useGetPaintingRecentGenerated,
  useGetStatsCommunity as useGetStatsCommunityGenerated,
} from './generated/default/default'

import type {
  GetSearchDiscordUsersParams,
  GetSearchPlayersParams,
  GetPaintingAll200Item,
  GetPaintingRecent200,
  GetStatsCommunity200,
} from './generated/bucketBotAPI.schemas'

export type {
  GetPaintingAll200Item,
  GetPaintingRecent200,
  GetStatsCommunity200,
}

// ── Re-export simple mutations (no invalidation needed) ────────────────────
export {
  usePostBotChatClearTestChannel,
  usePostBotChatPostMessage,
  usePostFactionRankings,
  usePostGenerateRankings,
  usePostGenerateTeamRankings,
  usePostPostDiscordRankings,
  usePostPostFactionRankings,
  usePostPostTeamRankings,
  usePostRunRankingsPipeline,
  usePostRetryPipelineSteps,
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

export const useGetPipelineJobSteps = (
  params?: Parameters<typeof useGetPipelineJobStepsGenerated>[0],
  options?: Parameters<typeof useGetPipelineJobStepsGenerated>[1],
) =>
  useGetPipelineJobStepsGenerated(params, {
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

export const useGetTeamsOverTimeTypeCode = (
  typeCode: string,
  options?: Parameters<typeof useGetTeamsOverTimeTypeCodeGenerated>[1],
) =>
  useGetTeamsOverTimeTypeCodeGenerated(typeCode, {
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

export const useGetFeatureFlags = (
  options?: Parameters<typeof useGetFeatureFlagsGenerated>[0],
) =>
  useGetFeatureFlagsGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const usePatchFeatureFlag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flag, is_enabled }: { flag: string; is_enabled: boolean }) =>
      customFetch<{ data: { flag: string; is_enabled: boolean } }>(
        `/v1/feature-flags/${encodeURIComponent(flag)}`,
        { method: 'PATCH', body: JSON.stringify({ is_enabled }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetFeatureFlagsQueryKey() })
    },
  })
}

export const useGetHasRole = (
  options?: Parameters<typeof useGetHasRoleGenerated>[0],
) =>
  useGetHasRoleGenerated({
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
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
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

export const useGetPlayerIdTeams = (
  id: string,
  options?: Parameters<typeof useGetPlayerIdTeamsGenerated>[1],
) =>
  useGetPlayerIdTeamsGenerated(id, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

export const useGetPlayerIdPaintingWins = (
  id: string,
  options?: Parameters<typeof useGetPlayerIdPaintingWinsGenerated>[1],
) =>
  useGetPlayerIdPaintingWinsGenerated(id, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

export const useGetPlayerIdIdentities = (
  id: string,
  options?: Parameters<typeof useGetPlayerIdIdentitiesGenerated>[1],
) =>
  useGetPlayerIdIdentitiesGenerated(id, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
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
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
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
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
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
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
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
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

export const useGetSearchPlayers = (
  params: GetSearchPlayersParams,
  options?: Parameters<typeof useGetSearchPlayersGenerated>[1],
) =>
  useGetSearchPlayersGenerated(params, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
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

// ── Upcoming Events ────────────────────────────────────────────────────────

export const useGetUpcomingEvents = (
  options?: Parameters<typeof useGetUpcomingEventsGenerated>[0],
) =>
  useGetUpcomingEventsGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const usePutUpcomingEventVenue = () => {
  const queryClient = useQueryClient()
  return usePutUpcomingEventsIdVenueGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetUpcomingEventsQueryKey(),
        })
      },
    },
  })
}

export const usePutUpcomingEventOrganiser = () => {
  const queryClient = useQueryClient()
  return usePutUpcomingEventsIdOrganiserGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetUpcomingEventsQueryKey(),
        })
      },
    },
  })
}

export const usePostSyncUpcomingEvents = () => {
  const queryClient = useQueryClient()
  return usePostSyncUpcomingEventsGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetUpcomingEventsQueryKey(),
        })
      },
    },
  })
}

export const usePostVenueGeocode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/v1/venues/${id}/geocode`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetVenuesQueryKey() })
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

export const usePostPlayerIdentityIdIgnore = (playerId?: number) => {
  const queryClient = useQueryClient()
  return usePostPlayerIdentityIdIgnoreGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
        if (playerId !== undefined) {
          queryClient.invalidateQueries({
            queryKey: getGetPlayerIdIdentitiesQueryKey(String(playerId)),
          })
        }
      },
    },
  })
}

export const usePostPlayerIdMatchDiscordUser = (playerId: number) => {
  const queryClient = useQueryClient()
  return usePostPlayerIdMatchDiscordUserGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdQueryKey(String(playerId)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdIdentitiesQueryKey(String(playerId)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const useDeletePlayerIdDiscordUser = (playerId: number) => {
  const queryClient = useQueryClient()
  return useDeletePlayerIdDiscordUserGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdQueryKey(String(playerId)),
        })
        // Unlinking changes whether this player's identities count as unmapped.
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const useDeletePlayerIdentityIdPlayer = (playerId: number) => {
  const queryClient = useQueryClient()
  return useDeletePlayerIdentityIdPlayerGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdIdentitiesQueryKey(String(playerId)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const usePostPlayerIdMergeIntoPlayer = (playerId: number) => {
  const queryClient = useQueryClient()
  return usePostPlayerIdMergeIntoPlayerGenerated({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdQueryKey(String(playerId)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetPlayerIdIdentitiesQueryKey(String(playerId)),
        })
        queryClient.invalidateQueries({
          queryKey: getGetUnmappedIdentitiesQueryKey(),
        })
      },
    },
  })
}

export const usePostPlayerIdentityIdMergeIntoPlayer = () => {
  const queryClient = useQueryClient()
  return usePostPlayerIdentityIdMergeIntoPlayerGenerated({
    mutation: {
      onSuccess: () => {
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

// ── Team Rankings ─────────────────────────────────────────────────────────

export const useGetTeamRankingsTypeCode = (
  typeCode: string,
  options?: Parameters<typeof useGetTeamRankingsTypeCodeGenerated>[1],
) =>
  useGetTeamRankingsTypeCodeGenerated(typeCode, {
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

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
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
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
  if (!response.ok) {
    let message = `Upload failed: ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {}
    notifications.show({ title: 'Error', message, color: 'red' })
    throw new Error(message)
  }
  const { key } = (await response.json()) as { key: string }
  return key
}

// ── Regions ──────────────────────────────────────────────────────────────────

export type RegionEventCount = {
  id: number
  geojson_name: string
  event_count: number
}

export const useGetRegionEventCounts = () =>
  useQuery({
    queryKey: ['/v1/regions/event-counts'],
    queryFn: () =>
      customFetch<{ data: RegionEventCount[] }>(
        '/v1/regions/event-counts',
      ).then((res) => res.data),
  })

export type RegionSnapshot = {
  date: string
  regions: { region_id: number; geojson_name: string; event_count: number }[]
}

export const useGetRegionsOverTime = () =>
  useQuery({
    queryKey: ['/v1/regions-over-time'],
    queryFn: () =>
      customFetch<{ data: RegionSnapshot[] }>('/v1/regions-over-time').then(
        (res) => res.data,
      ),
  })

export const usePostGenerateRegionSnapshot = () =>
  useMutation({
    mutationFn: () =>
      customFetch<{ ok: boolean }>('/v1/generate-region-snapshot', {
        method: 'POST',
      }),
  })

// ── Painting ──────────────────────────────────────────────────────────────────

export const useGetPaintingAll = (
  options?: Parameters<typeof useGetPaintingAllGenerated>[0],
) =>
  useGetPaintingAllGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })

export const useGetPaintingRecent = (
  options?: Parameters<typeof useGetPaintingRecentGenerated>[0],
) =>
  useGetPaintingRecentGenerated({
    ...options,
    query: {
      ...options?.query,
      select: (res) => {
        if (res.status !== 200)
          throw new Error(`unexpected status ${res.status}`)
        return res.data
      },
    },
  })

// ── Community Stats ───────────────────────────────────────────────────────────

export const useGetStatsCommunity = (
  options?: Parameters<typeof useGetStatsCommunityGenerated>[0],
) =>
  useGetStatsCommunityGenerated({
    ...options,
    query: { ...options?.query, select: (res) => res.data },
  })
