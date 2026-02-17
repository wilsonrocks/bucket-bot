import type { GetRankingsForPlayerResponse } from '@/hooks/useApi'
import { LineChart } from '@mantine/charts'
import { formatDate } from 'date-fns'

export const PlayerRankingOverTime = ({
  rankingsData,
}: {
  rankingsData: GetRankingsForPlayerResponse
}) => {
  if (!rankingsData) return <div>Loading...</div>
  return (
    <LineChart
      h={300}
      dataKey="date"
      data={rankingsData.rankings.map((row) => ({
        date: formatDate(new Date(row.created_at), 'MM/dd/yyyy'),
        rank: row.rank,
      }))}
      series={[{ name: 'rank', label: 'Rank' }]}
      yAxisProps={{
        domain: [1, rankingsData.metadata.number_of_players],
        reversed: true,
        ticks: [
          1,
          ...Array.from(
            {
              length: rankingsData.metadata.number_of_players / 10,
            },
            (_, i) => (i + 1) * 10,
          ),
        ],
      }}
    />
  )
}
