import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { Faction, IdentityProvider } from "../../../logic/fixtures";
import { calculatePoints } from "../../../logic/points";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";
import { updateTourney, updateTourneyRoute } from "./tourney";

const PLAYERS = 20;

// Minimal stand-in for app.ts: db in context, no JWT middleware.
function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    await next();
  });
  app.openapi(updateTourneyRoute, updateTourney);
  return app;
}

function update(
  tourneyId: number,
  changes: { tierCode: string; rounds: number; name?: string },
) {
  return makeApp().request("/tourney", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: tourneyId,
      name: changes.name ?? "Tier Test Event",
      days: 2,
      rounds: changes.rounds,
      tierCode: changes.tierCode,
    }),
  });
}

// A 20-player, 5-round EVENT, imported with the standard 120 max
async function addEvent(): Promise<number> {
  const tourney = await dbClient
    .insertInto("tourney")
    .values({
      name: "Tier Test Event",
      date: "2026-06-01",
      number_of_players: PLAYERS,
      rounds: 5,
      tier_code: "EVENT",
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  const { points } = calculatePoints(PLAYERS, 120);

  for (let i = 0; i < PLAYERS; i++) {
    const identity = await dbClient
      .insertInto("player_identity")
      .values({
        identity_provider_id: IdentityProvider.LONGSHANKS,
        external_id: `TIER-TEST-${i}`,
        provider_name: `Tier Tester ${i}`,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await dbClient
      .insertInto("result")
      .values({
        tourney_id: tourney.id,
        player_identity_id: identity.id,
        place: i + 1,
        points: points[i]!,
        faction_code: Faction.RESSERS,
        rounds_played: 5,
      })
      .execute();
  }

  return tourney.id;
}

async function pointsByPlace(tourneyId: number): Promise<number[]> {
  const results = await dbClient
    .selectFrom("result")
    .where("tourney_id", "=", tourneyId)
    .select("points")
    .orderBy("place")
    .execute();
  return results.map((r) => r.points);
}

let tourneyId: number;

beforeEach(async () => {
  await addTestDataToDb(dbClient);
  await dbClient
    .deleteFrom("result")
    .where("tourney_id", "in", (eb) =>
      eb.selectFrom("tourney").where("name", "=", "Tier Test Event").select("id"),
    )
    .execute();
  await dbClient.deleteFrom("tourney").where("name", "=", "Tier Test Event").execute();
  await dbClient
    .deleteFrom("player_identity")
    .where("external_id", "like", "TIER-TEST-%")
    .execute();
  tourneyId = await addEvent();
});

describe("POST /tourney", () => {
  test.each([
    { tierCode: "GT", max: 120 },
    { tierCode: "NATIONALS", max: 130 },
  ])("recalculates points when the tier changes to $tierCode", async ({ tierCode, max }) => {
    const response = await update(tourneyId, { tierCode, rounds: 5 });
    expect(response.status).toBe(200);

    const points = await pointsByPlace(tourneyId);
    // Exact equality: must match the importer's doubles bit-for-bit
    expect(points).toEqual(calculatePoints(PLAYERS, max).points);
    expect(points[0]).toBe(max);
    expect(points.at(-1)).toBe(5);
  });

  test("recalculates points when the rounds change", async () => {
    await update(tourneyId, { tierCode: "EVENT", rounds: 3 });
    expect(await pointsByPlace(tourneyId)).toEqual(
      calculatePoints(PLAYERS, 100).points,
    );
  });

  test("GT and NATIONALS max points ignore rounds", async () => {
    await update(tourneyId, { tierCode: "NATIONALS", rounds: 3 });
    expect((await pointsByPlace(tourneyId))[0]).toBe(130);
  });

  test("leaves points alone when tier and rounds are unchanged", async () => {
    // Points that don't match the formula, to prove they're not rewritten
    await dbClient
      .updateTable("result")
      .set({ points: 1 })
      .where("tourney_id", "=", tourneyId)
      .execute();

    await update(tourneyId, { tierCode: "EVENT", rounds: 5, name: "Tier Test Event" });
    expect((await pointsByPlace(tourneyId)).every((p) => p === 1)).toBe(true);
  });
});
