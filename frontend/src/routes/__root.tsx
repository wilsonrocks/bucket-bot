import { useEffect } from 'react'
import {
  AppShell,
  Burger,
  Center,
  Container,
  Group,
  Image,
  Text,
} from '@mantine/core'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Link,
  Outlet,
  createRootRouteWithContext,
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
            <Center>
              <Container>
                <Outlet />
              </Container>
            </Center>
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
