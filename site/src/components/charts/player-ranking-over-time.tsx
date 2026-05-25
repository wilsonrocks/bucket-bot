import { LineChart } from '@mantine/charts'
import { formatDate } from 'date-fns'
import { useEffect, useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)

type RankingsData = {
  metadata: { number_of_players: number | null }
  rankings: Array<{ created_at: Date | string | null; rank: number | null; total_points: number | null; name: string; batch_id: number | null }>
}

export const PlayerRankingOverTime = ({ rankingsData }: { rankingsData: RankingsData }) => {
  const isClient = useIsClient()
  useEffect(() => { window.dispatchEvent(new Event('resize')) }, [])
  if (!isClient) return null

  return (
    <LineChart
      h={300}
      dataKey="date"
      data={rankingsData.rankings
        .filter((row) => row.created_at !== null)
        .map((row) => ({
          date: formatDate(new Date(row.created_at!), 'MM/dd/yyyy'),
          rank: row.rank,
        }))}
      series={[{ name: 'rank', label: 'Rank' }]}
      yAxisProps={{
        domain: [1, rankingsData.metadata.number_of_players ?? 0],
        reversed: true,
        ticks: [1, ...Array.from({ length: (rankingsData.metadata.number_of_players ?? 0) / 10 }, (_, i) => (i + 1) * 10)],
      }}
    />
  )
}
