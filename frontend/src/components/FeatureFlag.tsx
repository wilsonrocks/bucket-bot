import { useGetFeatureFlags } from '@/api/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { Box } from '@mantine/core'
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
  if (!enabled && rankingReporter) {
    return (
      <Box
        style={{
          outline: '2px dashed red',
          position: 'relative',
          paddingTop: '1.5rem',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'red',
            color: 'white',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            padding: '0 4px',
            lineHeight: '1.5rem',
            userSelect: 'none',
          }}
        >
          PREVIEW: {flag}
        </Box>
        {children}
      </Box>
    )
  }
  return <>{children}</>
}
