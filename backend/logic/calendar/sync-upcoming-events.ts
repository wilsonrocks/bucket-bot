import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { geocodePostcode } from "../postcodes/geocode-postcode.js";
import { extractUkPostcode } from "../postcodes/extract-postcode.js";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
};

/**
 * Pulls upcoming events from the configured public Google Calendar and syncs
 * them into the upcoming_event table.
 *
 * Upserts by google_event_id so re-runs refresh the name/date but never touch
 * the admin-assigned venue_id. Future events that have disappeared from the
 * calendar are deleted.
 */
export async function syncUpcomingEvents(
  db: Kysely<DB>,
): Promise<{ upserted: number; deleted: number }> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!apiKey) throw new Error("GOOGLE_CALENDAR_API_KEY is not defined");
  if (!calendarId) throw new Error("GOOGLE_CALENDAR_ID is not defined");

  const now = new Date();
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events`,
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Google Calendar fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as GoogleCalendarResponse;

  const events = (data.items ?? [])
    .filter((item) => item.status !== "cancelled")
    .map((item) => {
      const startsAt = item.start?.dateTime ?? item.start?.date;
      if (!item.id || !item.summary || !startsAt) return null;
      return {
        google_event_id: item.id,
        name: item.summary,
        starts_at: new Date(startsAt),
        location: item.location ?? null,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (events.length === 0) {
    // A transient empty fetch shouldn't wipe the table. Skip the delete step.
    console.warn(
      "syncUpcomingEvents: calendar returned no usable events, skipping delete",
    );
    return { upserted: 0, deleted: 0 };
  }

  for (const event of events) {
    const geo = await geocodeLocation(db, event.location);
    // Always provide a geom expression (NULL when ungeocoded) so a re-sync
    // clears stale coordinates if a location loses its postcode.
    const geom = geo
      ? sql<string>`ST_SetSRID(ST_MakePoint(${geo.longitude}, ${geo.latitude}), 4326)`
      : sql<string>`NULL`;
    const region_id = geo?.regionId ?? null;

    await db
      .insertInto("upcoming_event")
      .values({ ...event, geom, region_id })
      .onConflict((oc) =>
        oc.column("google_event_id").doUpdateSet({
          name: event.name,
          starts_at: event.starts_at,
          location: event.location,
          geom,
          region_id,
        }),
      )
      .execute();
  }

  const deleted = await db
    .deleteFrom("upcoming_event")
    .where("starts_at", ">=", now)
    .where(
      "google_event_id",
      "not in",
      events.map((e) => e.google_event_id),
    )
    .executeTakeFirst();

  return {
    upserted: events.length,
    deleted: Number(deleted.numDeletedRows ?? 0),
  };
}

/**
 * Geocodes a free-text calendar location by extracting a UK postcode and
 * running it through postcodes.io (the same path venues use). Returns null when
 * no postcode can be found or the lookup fails — geocoding is best-effort.
 */
async function geocodeLocation(
  db: Kysely<DB>,
  location: string | null,
): Promise<{ longitude: number; latitude: number; regionId: number | null } | null> {
  const postcode = extractUkPostcode(location);
  if (!postcode) return null;

  const result = await geocodePostcode(postcode);
  if ("error" in result) {
    console.warn(
      `syncUpcomingEvents: geocode failed for postcode "${postcode}": ${result.error}`,
    );
    return null;
  }

  const { latitude, longitude, region, country } = result;
  const regionRow = await db
    .selectFrom("region")
    .select("id")
    .where("postcodes_api_name", "=", region ?? country)
    .executeTakeFirst();

  return { longitude, latitude, regionId: regionRow?.id ?? null };
}
