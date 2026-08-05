import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { IdentityProvider } from "../../../logic/fixtures";
import { addTestDataToDb } from "../../../logic/test-helpers/add-test-data-to-db";

vi.mock("../../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../../logic/discord-client.js";
import {
  detachIdentityFromPlayer,
  detachIdentityFromPlayerRoute,
  getUnmappedIdentities,
  getUnmappedIdentitiesRoute,
  mergeIdentityIntoPlayer,
  mergeIdentityIntoPlayerRoute,
} from "./identities";

// detachIdentityFromPlayer gates on the ranking-reporter Discord role.
function mockRankingReporter(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: vi.fn().mockReturnValue(hasRole) } },
          }),
        },
      }),
    },
  } as any);
}

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
    c.set("jwtPayload", { id: "test-user" } as any);
    await next();
  });
  app.openapi(getUnmappedIdentitiesRoute, getUnmappedIdentities);
  app.openapi(detachIdentityFromPlayerRoute, detachIdentityFromPlayer);
  app.openapi(mergeIdentityIntoPlayerRoute, mergeIdentityIntoPlayer);
  return app;
}

function detach(identityId: number) {
  return makeApp().request(`/player-identity/${identityId}/player`, {
    method: "DELETE",
  });
}

function mergeIdentity(identityId: number, targetPlayerId: number) {
  return makeApp().request(`/player-identity/${identityId}/merge-into-player`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetPlayerId }),
  });
}

async function fetchUnmapped() {
  const response = await makeApp().request("/unmapped-identities");
  expect(response.status).toBe(200);
  return (await response.json()) as UnmappedIdentity[];
}

async function addPlayer(name: string) {
  const player = await dbClient
    .insertInto("player")
    .values({ name })
    .returning("id")
    .executeTakeFirstOrThrow();
  return player.id;
}

// Adds a BOT4 identity plus its placeholder player, and by default a result —
// pass withResult: false to cover an identity that has never scored.
async function addBot4Identity(
  externalId: string,
  name: string,
  { withResult = true }: { withResult?: boolean } = {},
) {
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

  if (withResult) {
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
  }

  return identity.id;
}

const TEST_DISCORD_USER = "test-identities-discord";

beforeEach(async () => {
  // addTestDataToDb clears players, which frees the player.discord_id FK — so
  // this has to run after it. discord_user isn't in its sweep.
  await addTestDataToDb(dbClient);
  await dbClient
    .deleteFrom("discord_user")
    .where("discord_user_id", "=", TEST_DISCORD_USER)
    .execute();
  mockRankingReporter(true);
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

  test("lists an identity that has no results", async () => {
    const identityId = await addBot4Identity("uid-no-results", "No Results", {
      withResult: false,
    });

    const identity = (await fetchUnmapped()).find(
      (i) => i.player_identity_id === identityId,
    );

    expect(identity).toBeDefined();
    expect(identity!.results).toEqual([]);
  });

  test("lists an identity detached from a Discord-linked player", async () => {
    const identityId = await addBot4Identity("uid-detached", "Detached Player");
    // Give its player a Discord link — that alone used to hide the identity.
    await dbClient
      .insertInto("discord_user")
      .values({
        discord_user_id: TEST_DISCORD_USER,
        discord_username: "linked",
        discord_display_name: "Linked",
      })
      .execute();

    const playerId = (
      await dbClient
        .selectFrom("player_identity")
        .where("id", "=", identityId)
        .select("player_id")
        .executeTakeFirstOrThrow()
    ).player_id!;

    await dbClient
      .updateTable("player")
      .set({ discord_id: TEST_DISCORD_USER })
      .where("id", "=", playerId)
      .execute();

    expect(
      (await fetchUnmapped()).map((i) => i.player_identity_id),
    ).not.toContain(identityId);

    expect((await detach(identityId)).status).toBe(200);

    const identity = (await fetchUnmapped()).find(
      (i) => i.player_identity_id === identityId,
    );
    expect(identity).toBeDefined();
    expect(identity!.results).toHaveLength(1);
  });
});

describe("DELETE /player-identity/{id}/player", () => {
  test("detaches the identity and leaves its player and results alone", async () => {
    const identityId = await addBot4Identity("uid-detach-me", "Detach Me");
    const playerId = (
      await dbClient
        .selectFrom("player_identity")
        .where("id", "=", identityId)
        .select("player_id")
        .executeTakeFirstOrThrow()
    ).player_id!;

    const response = await detach(identityId);
    expect(response.status).toBe(200);

    const identity = await dbClient
      .selectFrom("player_identity")
      .where("id", "=", identityId)
      .select("player_id")
      .executeTakeFirstOrThrow();
    expect(identity.player_id).toBeNull();

    // The old player survives — it may still hold other identities.
    const player = await dbClient
      .selectFrom("player")
      .where("id", "=", playerId)
      .select("id")
      .executeTakeFirst();
    expect(player).toBeDefined();

    // Results follow the identity, not the player.
    const results = await dbClient
      .selectFrom("result")
      .where("player_identity_id", "=", identityId)
      .select("id")
      .execute();
    expect(results).toHaveLength(1);
  });

  test("rejects an identity that is already detached", async () => {
    const identityId = await addBot4Identity("uid-twice", "Detach Twice");

    expect((await detach(identityId)).status).toBe(200);
    expect((await detach(identityId)).status).toBe(400);
  });

  test("returns 404 for an unknown identity", async () => {
    expect((await detach(999999)).status).toBe(404);
  });

  test("returns 403 for a non-reporter", async () => {
    const identityId = await addBot4Identity("uid-guarded", "Guarded");
    mockRankingReporter(false);

    expect((await detach(identityId)).status).toBe(403);

    const identity = await dbClient
      .selectFrom("player_identity")
      .where("id", "=", identityId)
      .select("player_id")
      .executeTakeFirstOrThrow();
    expect(identity.player_id).not.toBeNull();
  });
});

describe("POST /player-identity/{id}/merge-into-player", () => {
  test("assigns a detached identity to the target player", async () => {
    const identityId = await addBot4Identity("uid-reassign", "Reassign Me");
    const targetPlayerId = await addPlayer("Real Owner");
    // A real owner has a Discord link — that's what takes the identity off the
    // unmapped list once it's reassigned.
    await dbClient
      .insertInto("discord_user")
      .values({
        discord_user_id: TEST_DISCORD_USER,
        discord_username: "realowner",
        discord_display_name: "Real Owner",
      })
      .execute();
    await dbClient
      .updateTable("player")
      .set({ discord_id: TEST_DISCORD_USER })
      .where("id", "=", targetPlayerId)
      .execute();

    expect((await detach(identityId)).status).toBe(200);
    expect((await mergeIdentity(identityId, targetPlayerId)).status).toBe(200);

    const identity = await dbClient
      .selectFrom("player_identity")
      .where("id", "=", identityId)
      .select("player_id")
      .executeTakeFirstOrThrow();
    expect(identity.player_id).toBe(targetPlayerId);

    // The target survives — a detached identity has no placeholder to merge away.
    const target = await dbClient
      .selectFrom("player")
      .where("id", "=", targetPlayerId)
      .select("id")
      .executeTakeFirst();
    expect(target).toBeDefined();

    expect(
      (await fetchUnmapped()).map((i) => i.player_identity_id),
    ).not.toContain(identityId);
  });

  test("still merges away the placeholder player of an attached identity", async () => {
    const identityId = await addBot4Identity("uid-placeholder", "Placeholder");
    const placeholderPlayerId = (
      await dbClient
        .selectFrom("player_identity")
        .where("id", "=", identityId)
        .select("player_id")
        .executeTakeFirstOrThrow()
    ).player_id!;
    const targetPlayerId = await addPlayer("Merge Target");

    expect((await mergeIdentity(identityId, targetPlayerId)).status).toBe(200);

    const identity = await dbClient
      .selectFrom("player_identity")
      .where("id", "=", identityId)
      .select("player_id")
      .executeTakeFirstOrThrow();
    expect(identity.player_id).toBe(targetPlayerId);

    const gone = await dbClient
      .selectFrom("player")
      .where("id", "=", placeholderPlayerId)
      .select("id")
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });
});
