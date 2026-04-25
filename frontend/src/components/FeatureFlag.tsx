import { useGetFeatureFlags } from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import type { ReactNode } from 'react'

export function FeatureFlag({
  flag,
  children,
}: {
  flag: string
  children: ReactNode
}) {
  const { data: flags, isLoading: flagsLoading } = useGetFeatureFlags()
  const { rankingReporter, isLoading: permissionsLoading } = usePermissions()
  if (flagsLoading || permissionsLoading) return null
  const enabled = flags?.find((f) => f.flag === flag)?.is_enabled ?? false
  if (!enabled && !rankingReporter) return null
  return <>{children}</>
}
