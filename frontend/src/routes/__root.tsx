import {
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
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { useDisclosure } from '@mantine/hooks'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import type { QueryClient } from '@tanstack/react-query'
import { LoginButton } from '@/components/LoginButton'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => {
    const [opened, { toggle }] = useDisclosure()
    return (
      <>
        <HeadContent />
        <AppShell
          padding="md"
          header={{ height: { base: 60, md: 70, lg: 80 } }}
          navbar={{
            width: { base: 200, md: 300, lg: 400 },
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
              <Image src="/bucket-bot-logo.png" alt="b(UK)et bot" w={50} />
              <Text>
                b(<b>UK</b>)et bot
              </Text>
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="md">
            <LoginButton />
          </AppShell.Navbar>
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
      { 'og:image': bucketBotImage.toString() },
    ],
  }),
})
