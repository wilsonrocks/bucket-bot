/**
 * Points for a single result. Events too small to award points give everyone
 * 0, shown as '-' so it doesn't read as a bad finish.
 */
export function formatResultPoints(points: number) {
  return points === 0 ? '-' : points.toFixed(2)
}
