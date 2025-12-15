import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useHasRole } from '@/hooks/useApi'

export const HasRankingReporterRole: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const hasRole = useHasRole()
  const navigate = useNavigate()
  if (!hasRole) {
    navigate({ to: '/' })
    return null
  }
  return <>{children}</>
}
