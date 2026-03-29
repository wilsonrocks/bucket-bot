import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
  component: () => (
    <>
      <Outlet />,
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          TanStackQueryDevtools,
        ]}
      />
    </>
  ),
  head: () => ({
    title: 'b(UK)et bot',
    meta: [
      { name: 'description', content: "UK Malifaux rankings and tournament tracking" },
      { property: 'og:title', content: 'b(UK)et bot' },
      { property: 'og:description', content: "UK Malifaux rankings and tournament tracking" },
      { property: 'og:image', content: 'https://malifaux.uk/logo512.png' },
      { property: 'og:url', content: 'https://malifaux.uk' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:image', content: 'https://malifaux.uk/logo512.png' },
    ],
  }),
})
