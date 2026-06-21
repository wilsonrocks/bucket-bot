import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import { syncUpcomingEvents } from "../calendar/sync-upcoming-events";

// A venue seeded by the test fixtures (Test Venue North West).
const TEST_VENUE_ID = 5001;

function mockCalendar(
  items: {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    status?: string;
    description?: string;
    location?: string;
  }[],
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
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

  test("stores and refreshes description and location", async () => {
    mockCalendar([
      {
        id: "g1",
        summary: "Spring GT",
        start: { dateTime: future(7) },
        description: "A grand tournament",
        location: "The Hall, London",
      },
    ]);
    await syncUpcomingEvents(dbClient);

    let row = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .where("google_event_id", "=", "g1")
      .executeTakeFirstOrThrow();
    expect(row.description).toBe("A grand tournament");
    expect(row.location).toBe("The Hall, London");

    mockCalendar([
      {
        id: "g1",
        summary: "Spring GT",
        start: { dateTime: future(7) },
        description: "Updated blurb",
        location: "New Venue, Leeds",
      },
    ]);
    await syncUpcomingEvents(dbClient);

    row = await dbClient
      .selectFrom("upcoming_event")
      .selectAll()
      .where("google_event_id", "=", "g1")
      .executeTakeFirstOrThrow();
    expect(row.description).toBe("Updated blurb");
    expect(row.location).toBe("New Venue, Leeds");
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
