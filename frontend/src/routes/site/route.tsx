import { LoginButton } from '@/components/LoginButton'
import { NetworkIndicator } from '@/components/network-indicator'
import { SiteNavbar } from '@/components/site-navbar'
import {
  AppShell,
  Burger,
  Container,
  Group,
  Image,
  Text,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  createFileRoute,
  HeadContent,
  Link,
  Outlet,
  useMatches,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/site')({
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
              <NetworkIndicator />

              <div style={{ marginLeft: 'auto' }}>
                <LoginButton />
              </div>
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="md" bg="gradient(white, lightgrey)">
            <SiteNavbar />
          </AppShell.Navbar>
          <AppShell.Main>
            <Container>
              {title && (
                <Title order={3} mb="md">
                  {title}
                </Title>
              )}

              <Outlet />
            </Container>
          </AppShell.Main>
        </AppShell>
      </>
    )
  },
})
