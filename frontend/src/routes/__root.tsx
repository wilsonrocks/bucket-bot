import { useEffect } from 'react'
import {
  Alert,
  AppShell,
  Burger,
  Center,
  Container,
  Group,
  Image,
  Text,
  Title,
} from '@mantine/core'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Link,
  Outlet,
  createRootRouteWithContext,
  useMatches,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { useDisclosure } from '@mantine/hooks'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import type { QueryClient } from '@tanstack/react-query'

import { LoginButton } from '@/components/LoginButton'
import { Navbar } from '@/components/navbar'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => {
    const [opened, { toggle, close }] = useDisclosure()

    const location = useRouterState({
      select: (s) => s.location,
    })

    useEffect(() => {
      close()
    }, [location.pathname])
    const matches = useMatches()
    const title = matches.at(-1)?.staticData.title

    return (
      <>
        <HeadContent />
        <AppShell
          padding="md"
          header={{ height: { base: 60, md: 70, lg: 80 } }}
          navbar={{
            width: { base: 200, md: 250, lg: 300 },
            breakpoint: 'sm',
            collapsed: { mobile: !opened },
          }}
        >
          <AppShell.Header>
            <Group h="100%" px="md">
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
              />
              <Link to="/">
                <Image src="/bucket-bot-logo.png" alt="b(UK)et bot" w={50} />
              </Link>
              <Text visibleFrom="xs">
                <Link to="/">
                  b(<b>UK</b>)et bot
                </Link>
              </Text>

              <div style={{ marginLeft: 'auto' }}>
                <LoginButton />
              </div>
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="md" bg="gradient(white, lightgrey)">
            <Navbar />
          </AppShell.Navbar>
          <AppShell.Main>
            <Container>
              <Alert title="Work in Progress" color="yellow" mb="md">
                <Text>
                  Until this project is up and running, this data is a weird
                  mashup of past events, so don't panic if it looks strange -
                  the important thing is it <em>works</em> at the moment.
                </Text>
                <Text>
                  The first event is on 10th January 2026 at Element if you
                  fancy being one of the first people to officially be ranked...
                </Text>
              </Alert>
              {title && (
                <Title order={3} mb="md">
                  {title}
                </Title>
              )}

              <Outlet />
            </Container>
          </AppShell.Main>
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
    )
  },

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
    ],
  }),
})
