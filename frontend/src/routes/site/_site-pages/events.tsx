import { Link } from '@/components/link'
import { useGetTourney as useGetAllTourneys, useGetTiers } from '@/api/hooks'
import { Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Route as EventIdRoute } from './event.$id'

export const Route = createFileRoute('/site/_site-pages/events')({
  component: RouteComponent,
  staticData: { title: 'Events' },
})

function RouteComponent() {
  const tourneys = useGetAllTourneys()
  const tiers = useGetTiers()
  const tierNameByCode = new Map(
    (tiers.data ?? []).map((t) => [t.code, t.name]),
  )
  return (
    <div>
      {tourneys.data ? (
        <Table
          data={{
            body: tourneys.data.map(
              ({ id, name, date, players, tier_code }) => [
                <Link to={EventIdRoute.to} params={{ id }} search={{ tab: undefined }}>
                  {name}
                </Link>,
                date ? format(parseISO(date), 'dd MMM yyyy') : '',
                players,
                tier_code && tier_code !== 'EVENT'
                  ? (tierNameByCode.get(tier_code) ?? tier_code)
                  : <Text c="dimmed">—</Text>,
              ],
            ),
            head: ['Name', 'Date', 'Players', 'Tier'],
          }}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
