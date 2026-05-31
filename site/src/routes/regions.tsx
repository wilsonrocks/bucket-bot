import { fetchRegionsOverTime } from '#/queries'
import { AnimatedRegions } from '#/components/animated-regions'
import { createFileRoute } from '@tanstack/react-router'
import { SITE_NAME, seo } from '#/helpers/seo'

export const Route = createFileRoute('/regions')({
  staticData: { title: 'Regions' },
  loader: async () => {
    const snapshots = await fetchRegionsOverTime()
    return { snapshots }
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
  const { snapshots } = Route.useLoaderData()
  return <AnimatedRegions snapshots={snapshots as any} />
}
