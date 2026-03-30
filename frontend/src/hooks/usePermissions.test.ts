import { renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { usePermissions } from './usePermissions'

vi.mock('@/api/hooks', () => ({
  useGetHasRole: vi.fn(),
}))

import { useGetHasRole } from '@/api/hooks'

describe('usePermissions', () => {
  test('returns false/empty when loading', () => {
    vi.mocked(useGetHasRole).mockReturnValue({ data: undefined, isLoading: true } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.rankingReporter).toBe(false)
    expect(result.current.captainOfTeamIds).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  test('returns rankingReporter true when data says so', () => {
    vi.mocked(useGetHasRole).mockReturnValue({
      data: { rankingReporter: true, captainOfTeamIds: [] },
      isLoading: false,
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.rankingReporter).toBe(true)
  })

  test('returns captainOfTeamIds from data', () => {
    vi.mocked(useGetHasRole).mockReturnValue({
      data: { rankingReporter: false, captainOfTeamIds: [1, 2] },
      isLoading: false,
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.captainOfTeamIds).toEqual([1, 2])
  })

  test('isTeamCaptain returns true for a team in captainOfTeamIds', () => {
    vi.mocked(useGetHasRole).mockReturnValue({
      data: { rankingReporter: false, captainOfTeamIds: [5, 10] },
      isLoading: false,
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.isTeamCaptain(5)).toBe(true)
    expect(result.current.isTeamCaptain(10)).toBe(true)
    expect(result.current.isTeamCaptain(99)).toBe(false)
  })

  test('isTeamCaptain returns false when not a captain of any team', () => {
    vi.mocked(useGetHasRole).mockReturnValue({
      data: { rankingReporter: false, captainOfTeamIds: [] },
      isLoading: false,
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.isTeamCaptain(1)).toBe(false)
  })
})
