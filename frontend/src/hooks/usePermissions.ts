import { useGetHasRole } from '@/api/hooks'

export function usePermissions() {
  const query = useGetHasRole()

  return {
    rankingReporter: query.data?.rankingReporter ?? false,
    captainOfTeamIds: query.data?.captainOfTeamIds ?? [],
    isTeamCaptain: (id: number) => (query.data?.captainOfTeamIds ?? []).includes(id),
    isLoading: query.isLoading,
  }
}
