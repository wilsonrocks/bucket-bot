import { AppNavLink } from "./app-nav-link";
import { SiteSearch } from "./site-search";
import type { NavPage } from "#/queries";

/** `pages`: CMS pages that are in the menu, listed after the built-in sections. */
export const SiteNavbar = ({ pages }: { pages: NavPage[] }) => {
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto">
      <SiteSearch />
      <AppNavLink to="/events" label="Past Events" />
      <AppNavLink to="/upcoming-events" label="Upcoming Events" />
      <AppNavLink to="/players" label="Players" />
      <AppNavLink to="/rankings" label="Rankings" />
      <AppNavLink to="/faction-rankings" label="Factions" />
      <AppNavLink to="/teams" label="Teams" />
      <AppNavLink to="/team-rankings" label="Team Rankings" />
      <AppNavLink to="/regions" label="Regions" />
      <AppNavLink to="/best-painted" label="Best Painted" />
      {pages.map((page) => (
        <AppNavLink key={page.url} to={page.url} label={page.title} />
      ))}
      <hr className="my-2 border-border" />
    </div>
  );
};
