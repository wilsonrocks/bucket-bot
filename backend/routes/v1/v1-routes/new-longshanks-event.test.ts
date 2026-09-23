import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { extractPlayersFromLongshanksHTML } from "../../../logic/longshanks/extract-longshanks-players";
import {
  newFrontierPlayersHtml,
  newFrontierTourneyHtml,
} from "../../../logic/longshanks/html";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";
import { newLongshanksEvent, newLongshanksEventRoute } from "./new-longshanks-event";

const NEW_FRONTIER_ID = "25681";

// The importer fetches two Longshanks pages: the standings panel and the event
// page. Serve the captured New Frontier HTML for each.
function mockLongshanks() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const html = url.includes("panel_standings.php")
      ? newFrontierPlayersHtml
      : newFrontierTourneyHtml;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Minimal stand-in for app.ts: db in context, same onError status mapping, and
// no JWT middleware (auth isn't what these tests are about).
function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    await next();
  });
  app.onError((err, c) => {
    const status = "status" in err ? Number(err.status) : 500;
    if (status === 500) console.error(err);
    return c.json({ error: err.message }, status as any);
  });
  app.openapi(newLongshanksEventRoute, newLongshanksEvent);
  return app;
}

function importEvent(app: ReturnType<typeof makeApp>, longshanksId: string) {
  return app.request(`/longshanks-event/${longshanksId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /longshanks-event/{id}", () => {
  test("creates the tourney and its results", async () => {
    mockLongshanks();
    const response = await importEvent(makeApp(), NEW_FRONTIER_ID);
    expect(response.status).toBe(200);

    const { id } = (await response.json()) as { id: number };

    const tourney = await dbClient
      .selectFrom("tourney")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(tourney.longshanks_id).toBe(NEW_FRONTIER_ID);
    expect(tourney.name).toBe("New Frontier");

    const players = extractPlayersFromLongshanksHTML(newFrontierPlayersHtml);
    const results = await dbClient
      .selectFrom("result")
      .where("tourney_id", "=", id)
      .selectAll()
      .execute();
    expect(results).toHaveLength(players.length);
  });

  test("rejects an event that has already been imported", async () => {
    mockLongshanks();
    const app = makeApp();

    const first = await importEvent(app, NEW_FRONTIER_ID);
    expect(first.status).toBe(200);
    const { id } = (await first.json()) as { id: number };

    const second = await importEvent(app, NEW_FRONTIER_ID);
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({
      error: `Tourney with longshanks id ${NEW_FRONTIER_ID} already exists with id ${id}`,
    });

    const tourneys = await dbClient
      .selectFrom("tourney")
      .where("longshanks_id", "=", NEW_FRONTIER_ID)
      .selectAll()
      .execute();
    expect(tourneys).toHaveLength(1);
  });
});
