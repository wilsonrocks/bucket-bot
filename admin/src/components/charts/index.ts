import { lazy } from 'react'

export const LazyPlayerRankingOverTimeChart = lazy(() =>
  import('./player-ranking-over-time').then((m) => ({
    default: m.PlayerRankingOverTime,
  })),
)
