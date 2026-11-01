import { describe, expect, it } from 'vitest'
import { formatResultPoints } from './format-result-points'

describe('formatResultPoints', () => {
  it('shows 0 points as a dash', () => {
    expect(formatResultPoints(0)).toBe('-')
  })

  it('shows other points to two decimal places', () => {
    expect(formatResultPoints(58.4166)).toBe('58.42')
    expect(formatResultPoints(5)).toBe('5.00')
  })
})
