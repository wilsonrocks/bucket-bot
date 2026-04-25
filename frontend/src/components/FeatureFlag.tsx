import { useGetFeatureFlags } from '@/api/hooks'
import type { ReactNode } from 'react'

export function FeatureFlag({
  flag,
  children,
}: {
  flag: string
  children: ReactNode
}) {
  const { data: flags, isLoading } = useGetFeatureFlags()
  if (isLoading) return null
  const enabled = flags?.find((f) => f.flag === flag)?.is_enabled ?? false
  if (!enabled) return null
  return <>{children}</>
}
