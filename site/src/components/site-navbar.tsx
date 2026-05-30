import { AppNavLink } from "./app-nav-link";

export const SiteNavbar = () => {
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto">
      <AppNavLink to="/events" label="Events" />
      <AppNavLink to="/players" label="Players" />
      <AppNavLink to="/rankings" label="Rankings" />
      <AppNavLink to="/faction-rankings" label="Factions" />
      <AppNavLink to="/teams" label="Teams" />
      <AppNavLink to="/team-rankings" label="Team Rankings" />
      <AppNavLink to="/regions" label="Regions" />
      <AppNavLink to="/best-painted" label="Best Painted" />
      <AppNavLink to="/how-it-works" label="How It Works" />
      <hr className="my-2 border-border" />
    </div>
  );
};
