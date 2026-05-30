import { SiteNavbar } from "#/components/site-navbar";
import { Menu, X } from "lucide-react";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    title?: string;
  }
}

declare global {
  interface Window {
    umami?: { track: () => void };
  }
}

import appCss from "../styles.css?url";
import logoUrl from "#/assets/bucket-bot-logo.png?inline";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, jsonLd, seo } from "#/helpers/seo";
import { ThemeProvider } from "#/theme/theme-provider";
import { ThemeToggle } from "#/components/theme-toggle";
import { NO_FLASH_SCRIPT } from "#/theme/theme";
import { getThemeCookie } from "#/theme/theme.server";

const rootWebsiteJsonLd = jsonLd({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
});

const rootOrgJsonLd = jsonLd({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
});

export const Route = createRootRoute({
  loader: () => getThemeCookie(),
  head: () => {
    const base = seo({
      title: SITE_NAME,
      path: "/",
    });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...base.meta,
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", href: logoUrl },
        ...base.links,
      ],
      scripts: [rootOrgJsonLd, rootWebsiteJsonLd],
    };
  },
  shellComponent: RootDocument,
  component: SiteLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const theme = Route.useLoaderData();
  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <HeadContent />
        {import.meta.env.VITE_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={import.meta.env.VITE_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteLayout() {
  const theme = Route.useLoaderData();
  const [navOpen, setNavOpen] = useState(false);
  const isInitialMount = useRef(true);

  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    setNavOpen(false);
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    window.umami?.track();
  }, [location.pathname]);

  const matches = useMatches();
  const title = matches.at(-1)?.staticData.title;

  return (
    <ThemeProvider initialTheme={theme}>
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-border bg-surface px-4 md:h-[70px] lg:h-[80px]">
        <button
          type="button"
          onClick={() => setNavOpen((o) => !o)}
          className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-muted sm:hidden"
          aria-label="Toggle navigation"
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/" search={{}}>
          <img
            src={logoUrl}
            alt="b(UK)et bot"
            width={50}
            height={53}
            className="w-[50px]"
          />
        </Link>
        {title && <span className="truncate font-semibold">{title}</span>}
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/"
            search={{}}
            className="hidden font-bold text-inherit no-underline sm:inline"
          >
            UK Malifaux Community
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`${
            navOpen ? "block" : "hidden"
          } fixed left-0 inset-y-0 top-[60px] z-20 w-[200px] border-r border-border bg-surface p-4 sm:static sm:left-auto sm:block sm:w-fit sm:top-0`}
        >
          <SiteNavbar />
        </aside>
        {navOpen && (
          <div
            className="fixed inset-0 top-[60px] z-10 bg-black/20 sm:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </ThemeProvider>
  );
}
