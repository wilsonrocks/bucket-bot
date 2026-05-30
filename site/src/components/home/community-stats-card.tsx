type CommunityStats = { totalPlayers: number; gamesPlayed: number; totalEvents: number }

export function CommunityStatsCard({ data }: { data: CommunityStats }) {
  return (
    <div className="h-full min-h-[160px] rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-lg font-semibold">Community Stats</h3>
      <p>
        <span className="font-bold">{data.totalPlayers.toLocaleString()}</span>
        {' '}people have played{' '}
        <span className="font-bold">{data.gamesPlayed.toLocaleString()}</span>
        {' '}games at{' '}
        <span className="font-bold">{data.totalEvents.toLocaleString()}</span>
        {' '}event{data.totalEvents === 1 ? '' : 's'} so far!
      </p>
    </div>
  )
}
