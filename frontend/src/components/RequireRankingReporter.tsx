import { usePermissions } from '@/hooks/usePermissions'
import { Route as LoginRoute } from '@/routes/site/login'
import { Route as TeamsRoute } from '@/routes/app/_app-pages/teams/'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

export function RequireRankingReporter({ children }: { children: ReactNode }) {
  const { rankingReporter, captainOfTeamIds, isLoading } = usePermissions()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (rankingReporter) return
    if (captainOfTeamIds.length > 0) {
      navigate({ to: TeamsRoute.to })
    } else {
      navigate({ to: LoginRoute.to })
    }
  }, [isLoading, rankingReporter, captainOfTeamIds.length])

  if (isLoading || !rankingReporter) return null

  return <>{children}</>
}
