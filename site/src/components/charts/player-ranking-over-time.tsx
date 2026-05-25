import { formatDate } from 'date-fns'
import { useEffect, useSyncExternalStore } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const subscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)

type RankingsData = {
  metadata: { number_of_players: number | null }
  rankings: Array<{
    created_at: Date | string | null
    rank: number | null
    total_points: number | null
    name: string
    batch_id: number | null
  }>
}

export const PlayerRankingOverTime = ({ rankingsData }: { rankingsData: RankingsData }) => {
  const isClient = useIsClient()
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [])
  if (!isClient) return null

  const total = rankingsData.metadata.number_of_players ?? 0
  const data = rankingsData.rankings
    .filter((row) => row.created_at !== null)
    .map((row) => ({
      date: formatDate(new Date(row.created_at!), 'MM/dd/yyyy'),
      rank: row.rank,
    }))

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis
            domain={[1, total]}
            reversed
            ticks={[1, ...Array.from({ length: total / 10 }, (_, i) => (i + 1) * 10)]}
          />
          <Tooltip />
          <Line type="monotone" dataKey="rank" stroke="#228be6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
