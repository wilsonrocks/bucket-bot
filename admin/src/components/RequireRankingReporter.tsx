import { usePermissions } from '@/hooks/usePermissions'
import { Route as LoginRoute } from '@/routes/login'
import { Route as TeamsRoute } from '@/routes/_app/teams/'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

export function RequireRankingReporter({
  children,
  allowAchievementAide = false,
}: {
  children: ReactNode
  /** Also let achievement aides in (they otherwise only get the achievements page). */
  allowAchievementAide?: boolean
}) {
  const { rankingReporter, achievementAide, captainOfTeamIds, isLoading } =
    usePermissions()
  const navigate = useNavigate()
  const allowed = rankingReporter || (allowAchievementAide && achievementAide)

  useEffect(() => {
    if (isLoading) return
    if (allowed) return
    if (achievementAide) {
      navigate({ to: '/achievements' })
    } else if (captainOfTeamIds.length > 0) {
      navigate({ to: TeamsRoute.to, search: { tab: undefined } })
    } else {
      navigate({ to: LoginRoute.to })
    }
  }, [isLoading, allowed, achievementAide, captainOfTeamIds.length])

  if (isLoading || !allowed) return null

  return <>{children}</>
}
