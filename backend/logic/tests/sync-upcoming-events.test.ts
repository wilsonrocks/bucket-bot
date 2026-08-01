import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import { syncUpcomingEvents } from "../calendar/sync-upcoming-events";

// A venue seeded by the test fixtures (Test Venue North West).
const TEST_VENUE_ID = 5001;

// postcodes.io stub: any postcode resolves to a London point (region id 7).
const POSTCODES_IO_RESULT = {
  status: 200,
  result: {
    latitude: 51.5,
    longitude: -0.1,
    region: "London",
    country: "England",
    postcode: "EC1A 1BB",
  },
};

function mockCalendar(
  items: {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    status?: string;
    location?: string;
  }[],
) {
  // URL-aware: postcodes.io lookups get a geocode result, everything else gets
  // the Google Calendar items payload.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      const body = url.includes("api.postcodes.io")
        ? POSTCODES_IO_RESULT
        : { items };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

beforeEach(async () => {
  // Clear upcoming_event first so its venue FK doesn't block the fixture's
  // venue teardown.
  await dbClient.deleteFrom("upcoming_event").execute();
  await addTestDataToDb(dbClient);
  process.env.GOOGLE_CALENDAR_API_KEY = "test-key";
  process.env.GOOGLE_CALENDAR_ID = "test-calendar";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncUpcomingEvents", () => {
  const future = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  test("inserts events pulled from the calendar", async () => {
    mockCalendar([
      { id: "g1", summary: "Spring GT", start: { dateTime: future(7) } },
      { id: "g2", summary: "All Day Event", start: { date: future(14).slice(0, 10) } },
    ]);

    const result = await syncUpcomingEvents(dbClient);
    expect(result.upserted).toBe(2);

    const rows = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .orderBy("google_event_id")
      .execute();
    expect(rows.map((r) => r.google_event_id)).toEqual(["g1", "g2"]);
    expect(rows[0]!.name).toBe("Spring GT");
  });

  test("stores and refreshes location", async () => {
    mockCalendar([
      {
        id: "g1",
        summary: "Spring GT",
        start: { dateTime: future(7) },
        location: "The Hall, London",
      },
    ]);
    await syncUpcomingEvents(dbClient);

    let row = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .where("google_event_id", "=", "g1")
      .executeTakeFirstOrThrow();
    expect(row.location).toBe("The Hall, London");

    mockCalendar([
      {
        id: "g1",
        summary: "Spring GT",
        start: { dateTime: future(7) },
        location: "New Venue, Leeds",
      },
    ]);
    await syncUpcomingEvents(dbClient);

    row = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .where("google_event_id", "=", "g1")
      .executeTakeFirstOrThrow();
    expect(row.location).toBe("New Venue, Leeds");
  });

  test("geocodes a location containing a UK postcode", async () => {
    mockCalendar([
      {
        id: "g1",
        summary: "Postcoded Event",
        start: { dateTime: future(7) },
        location: "The Hall, 1 High St, London EC1A 1BB",
      },
      {
        id: "g2",
        summary: "No Postcode Event",
        start: { dateTime: future(9) },
        location: "Somewhere vague",
      },
    ]);
    await syncUpcomingEvents(dbClient);

    const rows = await dbClient
      .selectFrom("upcoming_event")
      .select((eb) => [
        "google_event_id",
        "region_id",
        eb.fn<number | null>("ST_X", ["geom"]).as("lng"),
        eb.fn<number | null>("ST_Y", ["geom"]).as("lat"),
      ])
      .orderBy("google_event_id")
      .execute();

    const g1 = rows.find((r) => r.google_event_id === "g1")!;
    expect(g1.region_id).toBe(7); // London
    expect(g1.lng).toBeCloseTo(-0.1);
    expect(g1.lat).toBeCloseTo(51.5);

    const g2 = rows.find((r) => r.google_event_id === "g2")!;
    expect(g2.region_id).toBeNull();
    expect(g2.lng).toBeNull();
  });

  test("re-sync updates name/date but preserves admin-set venue_id", async () => {
    mockCalendar([{ id: "g1", summary: "Old Name", start: { dateTime: future(7) } }]);
    await syncUpcomingEvents(dbClient);

    await dbClient
      .updateTable("upcoming_event")
      .set({ venue_id: TEST_VENUE_ID })
      .where("google_event_id", "=", "g1")
      .execute();

    mockCalendar([{ id: "g1", summary: "New Name", start: { dateTime: future(8) } }]);
    await syncUpcomingEvents(dbClient);

    const row = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .where("google_event_id", "=", "g1")
      .executeTakeFirstOrThrow();
    expect(row.name).toBe("New Name");
    expect(row.venue_id).toBe(TEST_VENUE_ID);
  });

  test("deletes future events no longer present in the calendar", async () => {
    mockCalendar([
      { id: "g1", summary: "Keep", start: { dateTime: future(7) } },
      { id: "g2", summary: "Drop", start: { dateTime: future(9) } },
    ]);
    await syncUpcomingEvents(dbClient);

    mockCalendar([{ id: "g1", summary: "Keep", start: { dateTime: future(7) } }]);
    const result = await syncUpcomingEvents(dbClient);
    expect(result.deleted).toBe(1);

    const ids = await dbClient
      .selectFrom("upcoming_event")
      .select("google_event_id")
      .execute();
    expect(ids.map((r) => r.google_event_id)).toEqual(["g1"]);
  });

  test("skips deletion when the calendar returns no events", async () => {
    mockCalendar([{ id: "g1", summary: "Keep", start: { dateTime: future(7) } }]);
    await syncUpcomingEvents(dbClient);

    mockCalendar([]);
    const result = await syncUpcomingEvents(dbClient);
    expect(result).toEqual({ upserted: 0, deleted: 0 });

    const ids = await dbClient.selectFrom("upcoming_event").select("google_event_id").execute();
    expect(ids.map((r) => r.google_event_id)).toEqual(["g1"]);
  });
});
