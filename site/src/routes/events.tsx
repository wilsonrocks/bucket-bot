import { fetchTourneys, fetchTiers } from "#/queries";
import { Link } from "#/components/link";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { SITE_NAME, seo } from "#/helpers/seo";

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
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="px-2 py-2 font-semibold">Name</th>
          <th className="px-2 py-2 font-semibold">Date</th>
          <th className="px-2 py-2 font-semibold">Players</th>
          <th className="px-2 py-2 font-semibold">Tier</th>
        </tr>
      </thead>
      <tbody>
        {tourneys.map(({ id, name, date, players, tier_code }) => (
          <tr key={id} className="border-b border-border">
            <td className="px-2 py-1.5">
              <Link
                to="/event/$id"
                params={{ id }}
                search={{ tab: undefined, painting: undefined }}
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
