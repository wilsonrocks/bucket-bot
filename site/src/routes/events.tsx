import { fetchTourneys, fetchTiers } from '@/queries'
import { Link } from '@/components/link'
import { Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'

export const Route = createFileRoute('/events')({
  staticData: { title: 'Events' },
  loader: async () => {
    const [tourneys, tiers] = await Promise.all([fetchTourneys(), fetchTiers()])
    return { tourneys, tiers }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tourneys, tiers } = Route.useLoaderData()
  const tierNameByCode = new Map((tiers as any[]).map((t: any) => [t.code, t.name]))
  return (
    <Table data={{
      head: ['Name', 'Date', 'Players', 'Tier'],
      body: tourneys.map(({ id, name, date, players, tier_code }) => [
        <Link to="/event/$id" params={{ id }} search={{ tab: undefined, painting: undefined }}>{name}</Link>,
        date ? format(new Date(date), 'dd MMM yyyy') : '',
        players,
        tier_code && tier_code !== 'EVENT'
          ? (tierNameByCode.get(tier_code) ?? tier_code)
          : <Text c="dimmed">—</Text>,
      ]),
    }} />
  )
}
