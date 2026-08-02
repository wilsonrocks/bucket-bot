import { fetchAllUpcomingEvents } from "#/queries";
import { Link } from "#/components/link";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { SITE_NAME, seo } from "#/helpers/seo";

export const Route = createFileRoute("/upcoming-events")({
  staticData: { title: "Upcoming Events" },
  loader: async () => {
    const events = await fetchAllUpcomingEvents();
    return { events };
  },
  head: () =>
    seo({
      title: `Upcoming Events — ${SITE_NAME}`,
      description: "Upcoming UK Malifaux tournaments and events.",
      path: "/upcoming-events",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { events } = Route.useLoaderData();

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No upcoming events scheduled.
      </p>
    );
  }

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="px-2 py-2 font-semibold">Name</th>
          <th className="px-2 py-2 font-semibold">Date</th>
          <th className="px-2 py-2 font-semibold">Location</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className="border-b border-border">
            <td className="px-2 py-1.5">
              <Link to="/upcoming-event/$id" params={{ id: event.id }}>
                {event.name}
              </Link>
            </td>
            <td className="px-2 py-1.5">
              {format(new Date(event.startsAt), "dd MMM yyyy")}
            </td>
            <td className="px-2 py-1.5">
              {event.venueName ?? event.location ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
