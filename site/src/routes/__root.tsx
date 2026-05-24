import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { SiteNavbar } from "@/components/site-navbar";
import {
  AppShell,
  Burger,
  Container,
  Group,
  Image,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
  useRouterState,
} from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    title?: string;
  }
}

import { useEffect } from "react";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "b(UK)et bot" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: SiteLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <HeadContent />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
        <Scripts />
      </body>
    </html>
  );
}

function SiteLayout() {
  const [opened, { toggle, close }] = useDisclosure();

  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    close();
  }, [location.pathname]);

  const matches = useMatches();
  const title = matches.at(-1)?.staticData.title;

  return (
    <AppShell
      padding="md"
      header={{ height: { base: 60, md: 70, lg: 80 } }}
      navbar={{
        width: { base: 200, md: 250, lg: 300 },
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Link to="/" search={{}}>
            <Image src="/bucket-bot-logo.png" alt="b(UK)et bot" w={50} />
          </Link>
          <Text visibleFrom="xs" fw={700}>
            <Link to="/" search={{}} style={{ color: "inherit", textDecoration: "none" }}>
              UK Malifaux Community
            </Link>
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
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
  );
}
