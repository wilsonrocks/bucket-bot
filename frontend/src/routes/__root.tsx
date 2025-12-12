import { Center, Container, Title, AppShell, Group } from '@mantine/core'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import bucketBotImage from './bucket-bot.png'

import type { QueryClient } from '@tanstack/react-query'
import { LoginButton } from '@/components/LoginButton'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <HeadContent />
      <AppShell header={{ height: 80 }}>
        <AppShell.Header>
          <Group justify="space-between" p="sm">
            <Title ta="center" mb="md" order={1}>
              bUKet bot
            </Title>
            <LoginButton />
          </Group>
        </AppShell.Header>
        <Center>
          <Container>
            <Outlet />
          </Container>
        </Center>
      </AppShell>
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
    meta: [
      {
        name: 'description',
        content: "Let's get ranking!",
      },
      {
        title: 'b(UK)et bot',
      },
      {
        'og:title': 'b(UK)et bot',
      },
      { 'og:description': "Let's get ranking!" },
      { 'og:image': bucketBotImage.toString() },
    ],
  }),
})
