import { createFileRoute } from '@tanstack/react-router'
import { Table } from '@mantine/core'
import { useGetPlayers } from '@/api/hooks'
import { Link } from '@/components/link'
import { Route as PlayerRoute } from '@/routes/site/_site-pages/player.$id'
import { Route as TeamRoute } from '@/routes/site/_site-pages/team.$id'

export const Route = createFileRoute('/site/_site-pages/players')({
  component: RouteComponent,
  staticData: { title: 'Players' },
})

function RouteComponent() {
  const { data: players } = useGetPlayers()
  if (!players) return <div>Loading...</div>
  return (
    <Table
      data={{
        head: ['Name', 'Current Team', 'Events'],
        body: players.map((p) => [
          <Link to={PlayerRoute.to} params={{ id: p.id }} search={{ tab: undefined }}>
            {p.name}
          </Link>,
          p.current_team_id
            ? <Link to={TeamRoute.to} params={{ id: String(p.current_team_id) }} search={{ tab: undefined }}>
                {p.current_team_name}
              </Link>
            : (p.current_team_name ?? '—'),
          p.event_count,
        ]),
      }}
    />
  )
}
