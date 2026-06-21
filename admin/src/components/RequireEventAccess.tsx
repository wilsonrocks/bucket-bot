import { usePermissions } from '@/hooks/usePermissions'
import { Route as LoginRoute } from '@/routes/login'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

export function RequireEventAccess({ children }: { children: ReactNode }) {
  const { rankingReporter, organiserOfEventIds, isLoading } = usePermissions()
  const navigate = useNavigate()
  const allowed = rankingReporter || organiserOfEventIds.length > 0

  useEffect(() => {
    if (isLoading) return
    if (allowed) return
    navigate({ to: LoginRoute.to })
  }, [isLoading, allowed])

  if (isLoading || !allowed) return null

  return <>{children}</>
}
