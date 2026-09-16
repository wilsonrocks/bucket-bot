import { TextChannel } from "discord.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { IdentityProvider } from "../fixtures";

vi.mock("../discord-client.ts", async (importActual) => ({
  ...(await importActual<typeof import("../discord-client.ts")>()),
  getDiscordClient: vi.fn(),
}));

import { sql } from "kysely";
import { announceNextPlayer } from "../achievements/announce";
import { ACHIEVEMENT_RULES } from "../achievements/rules";
import { syncAchievements } from "../achievements/sync-achievements";
import { getDiscordClient } from "../discord-client";
import { mergePlaceholderIntoPlayer } from "../identities/merge-player";
import { runAchievementsTick } from "../pipeline/scheduler";

const PREFIX = "test-achievements-";

async function cleanup() {
  await dbClient.deleteFrom("tourney").where("name", "like", `${PREFIX}%`).execute();
  await dbClient
    .deleteFrom("player_identity")
    .where("external_id", "like", `${PREFIX}%`)
    .execute();
  await dbClient.deleteFrom("player").where("name", "like", `${PREFIX}%`).execute();
}

async function addTourney(name: string, date: string) {
  return (
    await dbClient
      .insertInto("tourney")
      .values({ name: `${PREFIX}${name}`, date, number_of_players: 8 })
      .returning("id")
      .executeTakeFirstOrThrow()
  ).id;
}

async function addPlayer(name: string) {
  const player = await dbClient
    .insertInto("player")
    .values({ name: `${PREFIX}${name}` })
    .returning("id")
    .executeTakeFirstOrThrow();
  const identity = await dbClient
    .insertInto("player_identity")
    .values({
      player_id: player.id,
      identity_provider_id: IdentityProvider.LONGSHANKS,
      external_id: `${PREFIX}${name}`,
      provider_name: name,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { playerId: player.id, identityId: identity.id };
}

async function addResult(identityId: number, tourneyId: number, place: number) {
  await dbClient
    .insertInto("result")
    .values({
      tourney_id: tourneyId,
      player_identity_id: identityId,
      place,
      points: 10,
      faction_code: "GUILD",
      rounds_played: 3,
    })
    .execute();
}

async function awardsFor(playerId: number) {
  return dbClient
    .selectFrom("player_achievement")
    .where("player_id", "=", playerId)
    .select([
      "achievement_id",
      "tourney_id",
      sql<string>`to_char(achieved_on, 'YYYY-MM-DD')`.as("achieved_on"),
      "discord_message_id",
    ])
    .orderBy("achievement_id")
    .execute();
}

async function markAllAnnounced(playerId: number, messageId: string) {
  await dbClient
    .updateTable("player_achievement")
    .set({ discord_message_id: messageId })
    .where("player_id", "=", playerId)
    .execute();
}

beforeEach(async () => {
  await cleanup();
  // Only this file's players should be queued for announcement.
  await dbClient
    .updateTable("player_achievement")
    .set({ discord_message_id: "pre-existing" })
    .where("discord_message_id", "is", null)
    .execute();
});
afterEach(cleanup);

describe("achievement rules", () => {
  test("every rule has an achievement row and vice versa", async () => {
    const rows = await dbClient.selectFrom("achievement").select("id").execute();
    expect(rows.map((r) => r.id).sort()).toEqual(Object.keys(ACHIEVEMENT_RULES).sort());
  });
});

describe("syncAchievements", () => {
  test("awards first event and first victory at the earliest qualifying tourney", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const t2 = await addTourney("t2", "2024-02-10");
    const t3 = await addTourney("t3", "2024-03-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t3, 1);
    await addResult(alice.identityId, t2, 1);
    await addResult(alice.identityId, t1, 4);

    await syncAchievements(dbClient);

    expect(await awardsFor(alice.playerId)).toEqual([
      { achievement_id: "first-event", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
      { achievement_id: "first-victory", tourney_id: t2, achieved_on: "2024-02-10", discord_message_id: null },
    ]);
  });

  test("breaks ties on the same date by tourney id", async () => {
    const tA = await addTourney("same-day-a", "2024-05-01");
    const tB = await addTourney("same-day-b", "2024-05-01");
    const bob = await addPlayer("bob");
    await addResult(bob.identityId, tB, 2);
    await addResult(bob.identityId, tA, 2);

    await syncAchievements(dbClient);

    expect(await awardsFor(bob.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "first-event", tourney_id: Math.min(tA, tB) }),
    ]);
  });

  test("is idempotent", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 1);

    await syncAchievements(dbClient);
    const second = await syncAchievements(dbClient);

    expect(second).toEqual({ inserted: 0, updated: 0, deleted: 0 });
  });

  test("awards achievements from newly imported results", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 3);
    await syncAchievements(dbClient);

    const t2 = await addTourney("t2", "2024-02-10");
    await addResult(alice.identityId, t2, 1);
    await syncAchievements(dbClient);

    expect((await awardsFor(alice.playerId)).map((a) => a.achievement_id)).toEqual([
      "first-event",
      "first-victory",
    ]);
  });

  test("removes awards when the qualifying identity is detached", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 1);
    await syncAchievements(dbClient);

    await dbClient
      .updateTable("player_identity")
      .set({ player_id: null })
      .where("id", "=", alice.identityId)
      .execute();
    await syncAchievements(dbClient);

    expect(await awardsFor(alice.playerId)).toEqual([]);
  });

  test("repoints an announced award when its tourney is deleted, keeping the announcement", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const t2 = await addTourney("t2", "2024-02-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 2);
    await addResult(alice.identityId, t2, 2);
    await syncAchievements(dbClient);
    await markAllAnnounced(alice.playerId, "msg-1");

    await dbClient.deleteFrom("tourney").where("id", "=", t1).execute();
    await syncAchievements(dbClient);

    expect(await awardsFor(alice.playerId)).toEqual([
      { achievement_id: "first-event", tourney_id: t2, achieved_on: "2024-02-10", discord_message_id: "msg-1" },
    ]);
  });

  test("throws when rules and achievement rows disagree", async () => {
    await expect(
      syncAchievements(dbClient, { ...ACHIEVEMENT_RULES, "not-in-db": async () => [] }),
    ).rejects.toThrow(/no row: \[not-in-db\]/);
  });
});

describe("merging players", () => {
  test("moves awards to the target and re-syncs to the earliest tourney", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const t2 = await addTourney("t2", "2024-02-10");
    const from = await addPlayer("from");
    const into = await addPlayer("into");
    await addResult(from.identityId, t1, 1);
    await addResult(into.identityId, t2, 3);
    await syncAchievements(dbClient);

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );
    expect(await awardsFor(from.playerId)).toEqual([]);

    await syncAchievements(dbClient);
    expect(await awardsFor(into.playerId)).toEqual([
      { achievement_id: "first-event", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
      { achievement_id: "first-victory", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
    ]);
  });

  test("keeps an announcement from the source when both hold the achievement", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const from = await addPlayer("from");
    const into = await addPlayer("into");
    await addResult(from.identityId, t1, 2);
    await addResult(into.identityId, t1, 3);
    await syncAchievements(dbClient);
    await markAllAnnounced(from.playerId, "msg-from");

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );

    expect(await awardsFor(into.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "first-event", discord_message_id: "msg-from" }),
    ]);
  });

  test("keeps the target's own announcement over the source's", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const from = await addPlayer("from");
    const into = await addPlayer("into");
    await addResult(from.identityId, t1, 2);
    await addResult(into.identityId, t1, 3);
    await syncAchievements(dbClient);
    await markAllAnnounced(from.playerId, "msg-from");
    await markAllAnnounced(into.playerId, "msg-into");

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );

    expect(await awardsFor(into.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "first-event", discord_message_id: "msg-into" }),
    ]);
  });
});

describe("announcing", () => {
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.DISCORD_ACHIEVEMENTS_CHANNEL_ID = "achievements-channel";
    let messageCount = 0;
    send = vi.fn(async () => ({ id: `discord-msg-${++messageCount}` }));
    const channel = Object.assign(Object.create(TextChannel.prototype), {
      isSendable: () => true,
      send,
    });
    vi.mocked(getDiscordClient).mockResolvedValue({
      channels: { fetch: vi.fn().mockResolvedValue(channel) },
      guilds: { fetch: vi.fn().mockResolvedValue({ members: { fetch: vi.fn() } }) },
    } as any);
  });

  test("does nothing when the queue is empty", async () => {
    expect(await announceNextPlayer(dbClient)).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  test("announces all of the longest-waiting player's achievements in one message", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    await addResult(alice.identityId, t1, 1);
    await syncAchievements(dbClient);
    await addResult(bob.identityId, t1, 2);
    await syncAchievements(dbClient);

    expect(await announceNextPlayer(dbClient)).toBe(alice.playerId);
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]![0];
    expect(payload.content).toContain("2 new achievements");
    expect(payload.embeds).toHaveLength(2);
    expect((await awardsFor(alice.playerId)).map((a) => a.discord_message_id)).toEqual([
      "discord-msg-1",
      "discord-msg-1",
    ]);
    expect((await awardsFor(bob.playerId))[0]!.discord_message_id).toBeNull();

    expect(await announceNextPlayer(dbClient)).toBe(bob.playerId);
    expect(await announceNextPlayer(dbClient)).toBeNull();
  });

  test("scheduled tick syncs but only announces during UK working hours", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 2);

    await runAchievementsTick(dbClient, new Date("2026-01-17T12:00:00Z")); // Saturday
    expect(await awardsFor(alice.playerId)).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();

    await runAchievementsTick(dbClient, new Date("2026-01-14T12:00:00Z")); // Wednesday
    expect(send).toHaveBeenCalledTimes(1);
  });
});
