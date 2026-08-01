import { fetchUpcomingEvent } from "#/queries";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Link } from "#/components/link";
import { SITE_NAME, absoluteUrl, jsonLd, seo } from "#/helpers/seo";
import type { SportsEvent, WithContext } from "schema-dts";

export const Route = createFileRoute("/upcoming-event/$id")({
  params: {
    parse: (raw: Record<string, string>) => ({ id: Number(raw.id) }),
    stringify: (params: { id: number }) => ({ id: String(params.id) }),
  },
  loader: async ({ params }) => {
    try {
      return await fetchUpcomingEvent({ data: { id: params.id } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const place = loaderData.venueName ?? loaderData.location;
    const description = `${loaderData.name}, an upcoming Malifaux event${
      place ? ` at ${place}` : ""
    }.`;

    const schema: WithContext<SportsEvent> = {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: loaderData.name,
      startDate: loaderData.startsAt,
      url: absoluteUrl(`/upcoming-event/${params.id}`),
      sport: "Malifaux",
      location: {
        "@type": "Place",
        name: place ?? "United Kingdom",
      },
    };

    return {
      ...seo({
        title: `${loaderData.name} — ${SITE_NAME}`,
        description,
        path: `/upcoming-event/${params.id}`,
        type: "article",
      }),
      scripts: [jsonLd(schema)],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const event = Route.useLoaderData();
  const venue = event.venueName
    ? event.venueTown
      ? `${event.venueName}, ${event.venueTown}`
      : event.venueName
    : event.location;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{event.name}</h1>
      <p className="mb-4 text-muted-foreground">
        {format(new Date(event.startsAt), "d MMMM yyyy")}
        {venue ? ` · ${venue}` : ""}
      </p>
      {event.organiserName && (
        <p className="mb-4 text-sm text-muted-foreground">
          Organised by{" "}
          {event.organiserPlayerId != null ? (
            <Link
              to="/player/$id"
              params={{ id: event.organiserPlayerId }}
              search={{ tab: undefined, typeCode: undefined, painting: undefined }}
            >
              {event.organiserName}
            </Link>
          ) : (
            event.organiserName
          )}
        </p>
      )}
      {event.description && (
        <p className="mb-6 whitespace-pre-line">{event.description}</p>
      )}
      <Link to="/upcoming-events">← All upcoming events</Link>
    </div>
  );
}
