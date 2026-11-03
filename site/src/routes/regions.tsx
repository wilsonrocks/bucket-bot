import {
  fetchRegionEvents,
  fetchRegionsOverTime,
  fetchRegionTeamPoints,
} from '#/queries'
import { AnimatedRegions } from '#/components/animated-regions'
import { TownPointsMap } from '#/components/town-points-map'
import { TeamRegionsMap } from '#/components/team-regions-map'
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
    // The teams map isn't animated, so like the town map it covers the year
    // ending at the most recent snapshot.
    const windowEnd = snapshots.at(-1)?.date ?? new Date().toISOString().slice(0, 10)
    const [events, teamPoints] = await Promise.all([
      fetchRegionEvents({ data: { since } }),
      fetchRegionTeamPoints({ data: { until: windowEnd } }),
    ])
    return { snapshots, events, teamPoints, windowEnd }
  },
  head: () =>
    seo({
      title: `Regions — ${SITE_NAME}`,
      description: 'UK Malifaux activity by region over time, and which teams score the most points in each region.',
      path: '/regions',
    }),
  component: RouteComponent,
})

function RouteComponent() {
  // The town and team maps aren't animated, so they show the same window as the
  // choropleth's final frame: the year ending at the most recent snapshot.
  const { snapshots, events, teamPoints, windowEnd } = Route.useLoaderData()
  return (
    <Tabs defaultValue="regions">
      <Tabs.List mb="md">
        <Tabs.Tab value="regions">Regions</Tabs.Tab>
        <Tabs.Tab value="towns">Towns</Tabs.Tab>
        <Tabs.Tab value="teams">Teams</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="regions">
        <AnimatedRegions snapshots={snapshots as any} events={events} />
      </Tabs.Panel>
      <Tabs.Panel value="towns">
        <TownPointsMap events={events} windowEnd={windowEnd} />
      </Tabs.Panel>
      <Tabs.Panel value="teams">
        <TeamRegionsMap rows={teamPoints} windowEnd={windowEnd} />
      </Tabs.Panel>
    </Tabs>
  )
}
