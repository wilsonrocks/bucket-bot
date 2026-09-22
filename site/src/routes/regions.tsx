import { fetchRegionEvents, fetchRegionsOverTime } from '#/queries'
import { AnimatedRegions } from '#/components/animated-regions'
import { VenuePointsMap } from '#/components/venue-points-map'
import { Tabs } from '#/components/routed-tabs'
import { createFileRoute } from '@tanstack/react-router'
import { SITE_NAME, seo } from '#/helpers/seo'

export const Route = createFileRoute('/regions')({
  staticData: { title: 'Regions' },
  loader: async () => {
    const snapshots = await fetchRegionsOverTime()
    // Each snapshot counts the year up to its own date, so the earliest event the
    // map can ever show is a year before the earliest snapshot.
    const earliest = snapshots[0]?.date
    const since = earliest
      ? `${Number(earliest.slice(0, 4)) - 1}${earliest.slice(4)}`
      : '1970-01-01'
    const events = await fetchRegionEvents({ data: { since } })
    return { snapshots, events }
  },
  head: () =>
    seo({
      title: `Regions — ${SITE_NAME}`,
      description: 'UK Malifaux activity by region over time.',
      path: '/regions',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { snapshots, events } = Route.useLoaderData()
  // The venue map isn't animated, so it shows the same window as the choropleth's
  // final frame: the year ending at the most recent snapshot.
  const windowEnd = snapshots.at(-1)?.date ?? new Date().toISOString().slice(0, 10)
  return (
    <Tabs defaultValue="regions">
      <Tabs.List mb="md">
        <Tabs.Tab value="regions">Regions</Tabs.Tab>
        <Tabs.Tab value="venues">Venues</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="regions">
        <AnimatedRegions snapshots={snapshots as any} events={events} />
      </Tabs.Panel>
      <Tabs.Panel value="venues">
        <VenuePointsMap events={events} windowEnd={windowEnd} />
      </Tabs.Panel>
    </Tabs>
  )
}
