import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { IdentityProvider } from "../../../logic/fixtures";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";
import { getUnmappedIdentities, getUnmappedIdentitiesRoute } from "./identities";

type UnmappedIdentity = {
  player_identity_id: number;
  external_id: string;
  provider_name: string;
  results: unknown[];
};

function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    await next();
  });
  app.openapi(getUnmappedIdentitiesRoute, getUnmappedIdentities);
  return app;
}

async function fetchUnmapped() {
  const response = await makeApp().request("/unmapped-identities");
  expect(response.status).toBe(200);
  return (await response.json()) as UnmappedIdentity[];
}

// Adds a BOT4 identity (plus placeholder player and a result, since the
// endpoint inner-joins results) and returns its player_identity id.
async function addBot4Identity(externalId: string, name: string) {
  const player = await dbClient
    .insertInto("player")
    .values({ name })
    .returning("id")
    .executeTakeFirstOrThrow();

  const identity = await dbClient
    .insertInto("player_identity")
    .values({
      player_id: player.id,
      identity_provider_id: IdentityProvider.BOT4,
      external_id: externalId,
      provider_name: name,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  const tourney = await dbClient
    .selectFrom("tourney")
    .select("id")
    .orderBy("id")
    .executeTakeFirstOrThrow();

  await dbClient
    .insertInto("result")
    .values({
      tourney_id: tourney.id,
      player_identity_id: identity.id,
      place: 1,
      points: 10,
      faction_code: "GUILD",
      rounds_played: 3,
    })
    .execute();

  return identity.id;
}

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("GET /unmapped-identities", () => {
  test("returns the newest identities first", async () => {
    const first = await addBot4Identity("uid-first", "First Imported");
    const second = await addBot4Identity("uid-second", "Second Imported");
    const third = await addBot4Identity("uid-third", "Third Imported");

    const identities = await fetchUnmapped();
    const ids = identities.map((i) => i.player_identity_id);

    // The three we just added lead the list, most recent first.
    expect(ids.slice(0, 3)).toEqual([third, second, first]);
    // And the whole list is ordered, including the seeded fixtures. Serial ids
    // run in step with created_at, so descending id is the observable proof of
    // the created_at ordering.
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  test("groups every result under its identity", async () => {
    const identityId = await addBot4Identity("uid-grouped", "Grouped Player");

    const identity = (await fetchUnmapped()).find(
      (i) => i.player_identity_id === identityId,
    );

    expect(identity).toMatchObject({
      external_id: "uid-grouped",
      provider_name: "Bag o Tools 4",
    });
    expect(identity!.results).toHaveLength(1);
  });

  test("excludes ignored identities", async () => {
    const identityId = await addBot4Identity("uid-ignored", "Ignored Player");

    await dbClient
      .updateTable("player_identity")
      .set({ is_ignored: true })
      .where("id", "=", identityId)
      .execute();

    const ids = (await fetchUnmapped()).map((i) => i.player_identity_id);
    expect(ids).not.toContain(identityId);
  });
});
