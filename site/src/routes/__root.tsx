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
import { useEffect, useState } from "react";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    title?: string;
  }
}

import appCss from "../styles.css?url";
import logoUrl from "#/assets/bucket-bot-logo.png?inline";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "b(UK)et bot" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoUrl },
    ],
  }),
  shellComponent: RootDocument,
  component: SiteLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteLayout() {
  const [navOpen, setNavOpen] = useState(false);

  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const matches = useMatches();
  const title = matches.at(-1)?.staticData.title;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-gray-200 bg-white px-4 md:h-[70px] lg:h-[80px]">
        <button
          type="button"
          onClick={() => setNavOpen((o) => !o)}
          className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-gray-100 sm:hidden"
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
        <Link
          to="/"
          search={{}}
          className="ml-auto hidden font-bold text-inherit no-underline sm:inline"
        >
          UK Malifaux Community
        </Link>
      </header>

      <div className="flex flex-1">
        <aside
          className={`${
            navOpen ? "block" : "hidden"
          } fixed inset-y-0 top-[60px] z-20 w-[200px] border-r border-gray-200 bg-white p-4 sm:static sm:block sm:w-[250px] sm:top-0 lg:w-[300px]`}
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
  );
}
