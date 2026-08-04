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
  matchPlayerIdToDiscordUser,
  matchPlayerIdToDiscordUserRoute,
} from "./discord-id";
import {
  getPlayerIdentities,
  getPlayerIdentitiesRoute,
  mergePlayerIntoPlayer,
  mergePlayerIntoPlayerRoute,
} from "./players";

const DISCORD_ALICE = "test-players-discord-alice";
const DISCORD_BOB = "test-players-discord-bob";

// The merge and match handlers gate on the ranking-reporter Discord role, so
// every test needs a client that answers that role check.
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

// Stand-in for app.ts: db and a jwtPayload in context, no real JWT middleware.
function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    c.set("jwtPayload", { id: "test-user" } as any);
    await next();
  });
  app.openapi(getPlayerIdentitiesRoute, getPlayerIdentities);
  app.openapi(mergePlayerIntoPlayerRoute, mergePlayerIntoPlayer);
  app.openapi(matchPlayerIdToDiscordUserRoute, matchPlayerIdToDiscordUser);
  return app;
}

function fetchIdentities(playerId: number) {
  return makeApp().request(`/player/${playerId}/identities`);
}

function merge(playerId: number, targetPlayerId: number) {
  return makeApp().request(`/player/${playerId}/merge-into-player`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetPlayerId }),
  });
}

function matchDiscord(playerId: number, discordUserId: string) {
  return makeApp().request(`/player/${playerId}/match-discord-user`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ discordUserId }),
  });
}

async function addPlayerWithIdentity(
  name: string,
  provider: IdentityProvider,
  externalId: string,
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
      identity_provider_id: provider,
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

  return { playerId: player.id, identityId: identity.id };
}

async function addSnapshot(playerId: number) {
  const batch = await dbClient
    .insertInto("ranking_snapshot_batch")
    .values({ type_code: "ROLLING_YEAR" })
    .returning("id")
    .executeTakeFirstOrThrow();

  await dbClient
    .insertInto("ranking_snapshot")
    .values({
      batch_id: batch.id,
      player_id: playerId,
      rank: 1,
      total_points: 10,
    })
    .execute();
}

// Teams are shared across suites and referenced by rows addTestDataToDb
// doesn't clear, so this file only ever creates and removes its own, by prefix.
const TEAM_PREFIX = "test-players-merge-";

async function addTeamMembership(
  playerId: number,
  teamName: string,
  joinDate: string,
) {
  const team = await dbClient
    .insertInto("team")
    .values({ name: `${TEAM_PREFIX}${teamName}` })
    .returning("id")
    .executeTakeFirstOrThrow();

  await dbClient
    .insertInto("membership")
    .values({ player_id: playerId, team_id: team.id, join_date: joinDate })
    .execute();

  return team.id;
}

async function addDiscordUser(discordUserId: string, displayName: string) {
  await dbClient
    .insertInto("discord_user")
    .values({
      discord_user_id: discordUserId,
      discord_username: displayName.toLowerCase(),
      discord_display_name: displayName,
    })
    .execute();
}

async function cleanupTestTeams() {
  const teams = await dbClient
    .selectFrom("team")
    .select("id")
    .where("name", "like", `${TEAM_PREFIX}%`)
    .execute();

  if (teams.length === 0) return;

  const teamIds = teams.map((t) => t.id);
  await dbClient.deleteFrom("membership").where("team_id", "in", teamIds).execute();
  await dbClient.deleteFrom("team").where("id", "in", teamIds).execute();
}

beforeEach(async () => {
  await cleanupTestTeams();
  await addTestDataToDb(dbClient);
  await dbClient
    .deleteFrom("discord_user")
    .where("discord_user_id", "in", [DISCORD_ALICE, DISCORD_BOB])
    .execute();
  mockRankingReporter(true);
});

describe("GET /player/{id}/identities", () => {
  test("returns every identity for the player with its result count", async () => {
    const { playerId, identityId } = await addPlayerWithIdentity(
      "Dupe One",
      IdentityProvider.BOT,
      "Dupe One",
    );
    const second = await addPlayerWithIdentity(
      "Dupe Two",
      IdentityProvider.BOT4,
      "uid-dupe-two",
      { withResult: false },
    );

    // Put both identities on the same player, as a merge would.
    await dbClient
      .updateTable("player_identity")
      .set({ player_id: playerId, is_ignored: true })
      .where("id", "=", second.identityId)
      .execute();

    const response = await fetchIdentities(playerId);
    expect(response.status).toBe(200);
    const identities = (await response.json()) as any[];

    expect(identities).toHaveLength(2);
    expect(identities.map((i) => i.id).sort()).toEqual(
      [identityId, second.identityId].sort(),
    );

    const bot = identities.find((i) => i.provider_id === IdentityProvider.BOT);
    expect(bot).toMatchObject({
      external_id: "Dupe One",
      provider_name: "Bag o Tools",
      display_name: "Dupe One",
      is_ignored: false,
      result_count: 1,
    });

    const bot4 = identities.find((i) => i.provider_id === IdentityProvider.BOT4);
    expect(bot4).toMatchObject({
      external_id: "uid-dupe-two",
      provider_name: "Bag o Tools 4",
      is_ignored: true,
      result_count: 0,
    });
  });

  test("returns an empty list for a player with no identities", async () => {
    const player = await dbClient
      .insertInto("player")
      .values({ name: "No Identities" })
      .returning("id")
      .executeTakeFirstOrThrow();

    const response = await fetchIdentities(player.id);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("POST /player/{id}/merge-into-player", () => {
  test("moves identities and memberships, then deletes the source player", async () => {
    const source = await addPlayerWithIdentity(
      "Iain Torrance",
      IdentityProvider.BOT4,
      "uid-iain",
    );
    const target = await addPlayerWithIdentity(
      "Iain Torrance",
      IdentityProvider.BOT,
      "Iain Torrance",
    );
    await addSnapshot(source.playerId);
    await addTeamMembership(source.playerId, "test-merge-Team Alpha", "2026-01-01");

    const response = await merge(source.playerId, target.playerId);
    expect(response.status).toBe(200);

    const identities = await dbClient
      .selectFrom("player_identity")
      .where("player_id", "=", target.playerId)
      .select("id")
      .execute();
    expect(identities.map((i) => i.id).sort()).toEqual(
      [source.identityId, target.identityId].sort(),
    );

    const memberships = await dbClient
      .selectFrom("membership")
      .where("player_id", "=", target.playerId)
      .selectAll()
      .execute();
    expect(memberships).toHaveLength(1);

    const snapshots = await dbClient
      .selectFrom("ranking_snapshot")
      .where("player_id", "=", source.playerId)
      .selectAll()
      .execute();
    expect(snapshots).toHaveLength(0);

    const sourcePlayer = await dbClient
      .selectFrom("player")
      .where("id", "=", source.playerId)
      .selectAll()
      .executeTakeFirst();
    expect(sourcePlayer).toBeUndefined();

    // The results follow their identities, so both are now the target's.
    const results = await dbClient
      .selectFrom("result")
      .innerJoin(
        "player_identity",
        "player_identity.id",
        "result.player_identity_id",
      )
      .where("player_identity.player_id", "=", target.playerId)
      .select("result.id")
      .execute();
    expect(results).toHaveLength(2);
  });

  test("rejects merging a player into itself", async () => {
    const { playerId } = await addPlayerWithIdentity(
      "Self Merge",
      IdentityProvider.BOT4,
      "uid-self",
    );

    const response = await merge(playerId, playerId);
    expect(response.status).toBe(400);
  });

  test("rejects merging a Discord-linked player into an unlinked one", async () => {
    await addDiscordUser(DISCORD_ALICE, "Alice");
    const source = await addPlayerWithIdentity(
      "Linked Source",
      IdentityProvider.BOT4,
      "uid-linked-source",
    );
    const target = await addPlayerWithIdentity(
      "Unlinked Target",
      IdentityProvider.BOT,
      "Unlinked Target",
    );
    await dbClient
      .updateTable("player")
      .set({ discord_id: DISCORD_ALICE })
      .where("id", "=", source.playerId)
      .execute();

    const response = await merge(source.playerId, target.playerId);
    expect(response.status).toBe(400);

    const stillThere = await dbClient
      .selectFrom("player")
      .where("id", "=", source.playerId)
      .selectAll()
      .executeTakeFirst();
    expect(stillThere).toBeDefined();
  });

  test("returns 404 when the target player does not exist", async () => {
    const { playerId } = await addPlayerWithIdentity(
      "Lonely",
      IdentityProvider.BOT4,
      "uid-lonely",
    );

    const response = await merge(playerId, 999_999);
    expect(response.status).toBe(404);
  });

  test("returns 409 when both players have overlapping memberships", async () => {
    const source = await addPlayerWithIdentity(
      "Overlap Source",
      IdentityProvider.BOT4,
      "uid-overlap-source",
    );
    const target = await addPlayerWithIdentity(
      "Overlap Target",
      IdentityProvider.BOT,
      "Overlap Target",
    );
    await addTeamMembership(source.playerId, "test-merge-Team Beta", "2026-01-01");
    await addTeamMembership(target.playerId, "test-merge-Team Gamma", "2026-02-01");

    const response = await merge(source.playerId, target.playerId);
    expect(response.status).toBe(409);

    // The whole merge rolled back.
    const sourcePlayer = await dbClient
      .selectFrom("player")
      .where("id", "=", source.playerId)
      .selectAll()
      .executeTakeFirst();
    expect(sourcePlayer).toBeDefined();
  });

  test("is forbidden without the ranking reporter role", async () => {
    mockRankingReporter(false);
    const source = await addPlayerWithIdentity(
      "No Role Source",
      IdentityProvider.BOT4,
      "uid-no-role-source",
    );
    const target = await addPlayerWithIdentity(
      "No Role Target",
      IdentityProvider.BOT,
      "No Role Target",
    );

    const response = await merge(source.playerId, target.playerId);
    expect(response.status).toBe(403);
  });
});

describe("POST /player/{id}/match-discord-user", () => {
  test("links the player and renames it to the Discord display name", async () => {
    await addDiscordUser(DISCORD_ALICE, "Alice");
    const { playerId } = await addPlayerWithIdentity(
      "Unlinked Player",
      IdentityProvider.BOT4,
      "uid-unlinked",
    );

    const response = await matchDiscord(playerId, DISCORD_ALICE);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ playerId });

    const player = await dbClient
      .selectFrom("player")
      .where("id", "=", playerId)
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(player.discord_id).toBe(DISCORD_ALICE);
    expect(player.name).toBe("Alice");
  });

  test("merges into the player that already owns that Discord user", async () => {
    await addDiscordUser(DISCORD_BOB, "Bob");
    const existing = await addPlayerWithIdentity(
      "Bob",
      IdentityProvider.BOT,
      "Bob",
    );
    await dbClient
      .updateTable("player")
      .set({ discord_id: DISCORD_BOB })
      .where("id", "=", existing.playerId)
      .execute();

    const source = await addPlayerWithIdentity(
      "Bob Again",
      IdentityProvider.BOT4,
      "uid-bob-again",
    );

    const response = await matchDiscord(source.playerId, DISCORD_BOB);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ playerId: existing.playerId });

    const identity = await dbClient
      .selectFrom("player_identity")
      .where("id", "=", source.identityId)
      .select("player_id")
      .executeTakeFirstOrThrow();
    expect(identity.player_id).toBe(existing.playerId);

    const gone = await dbClient
      .selectFrom("player")
      .where("id", "=", source.playerId)
      .selectAll()
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });

  test("rejects a player that is already linked", async () => {
    await addDiscordUser(DISCORD_ALICE, "Alice");
    await addDiscordUser(DISCORD_BOB, "Bob");
    const { playerId } = await addPlayerWithIdentity(
      "Already Linked",
      IdentityProvider.BOT4,
      "uid-already-linked",
    );
    await dbClient
      .updateTable("player")
      .set({ discord_id: DISCORD_ALICE })
      .where("id", "=", playerId)
      .execute();

    const response = await matchDiscord(playerId, DISCORD_BOB);
    expect(response.status).toBe(400);
  });

  test("returns 404 for an unknown Discord user", async () => {
    const { playerId } = await addPlayerWithIdentity(
      "No Such Discord",
      IdentityProvider.BOT4,
      "uid-no-such-discord",
    );

    const response = await matchDiscord(playerId, "does-not-exist");
    expect(response.status).toBe(404);
  });
});
