import { fetchTourneys, fetchTiers } from "#/queries";
import { Link } from "#/components/link";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { SITE_NAME, seo } from "#/helpers/seo";
import { SortableTh, useTableSort } from "#/components/sortable-table";

export const Route = createFileRoute("/events")({
  staticData: { title: "Past Events" },
  loader: async () => {
    const [tourneys, tiers] = await Promise.all([
      fetchTourneys(),
      fetchTiers(),
    ]);
    return { tourneys, tiers };
  },
  head: () =>
    seo({
      title: `Past Events — ${SITE_NAME}`,
      description: "UK Malifaux tournament events.",
      path: "/events",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tourneys, tiers } = Route.useLoaderData();
  const tierNameByCode = new Map(
    (tiers as any[]).map((t: any) => [t.code, t.name]),
  );
  const { rows, getSortProps } = useTableSort(tourneys, {
    name: { value: (t) => t.name },
    date: { value: (t) => t.date, natural: "desc" },
    players: { value: (t) => t.players, natural: "desc" },
    tier: {
      value: (t) =>
        t.tier_code && t.tier_code !== "EVENT"
          ? (tierNameByCode.get(t.tier_code) ?? t.tier_code)
          : null,
    },
  });
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          <SortableTh {...getSortProps("name")}>Name</SortableTh>
          <SortableTh {...getSortProps("date")}>Date</SortableTh>
          <SortableTh {...getSortProps("players")}>Players</SortableTh>
          <SortableTh {...getSortProps("tier")}>Tier</SortableTh>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ id, name, date, players, tier_code }) => (
          <tr key={id} className="border-b border-border">
            <td className="px-2 py-1.5">
              <Link
                to="/event/$id"
                params={{ id }}
                search={{ tab: undefined, painting: undefined, photo: undefined }}
              >
                {name}
              </Link>
            </td>
            <td className="px-2 py-1.5">
              {date ? format(new Date(date), "dd MMM yyyy") : ""}
            </td>
            <td className="px-2 py-1.5">{players}</td>
            <td className="px-2 py-1.5">
              {tier_code && tier_code !== "EVENT" ? (
                (tierNameByCode.get(tier_code) ?? tier_code)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
