import { TextChannel } from "discord.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import {
  makeAchievementFixtures,
  pickRules,
} from "../test-helpers/achievement-fixtures";

vi.mock("../discord-client.ts", async (importActual) => ({
  ...(await importActual<typeof import("../discord-client.ts")>()),
  getDiscordClient: vi.fn(),
}));

import { announceNextPlayer } from "../achievements/announce";
import { ACHIEVEMENT_RULES } from "../achievements/rules";
import { syncAchievements } from "../achievements/sync-achievements";
import { getDiscordClient } from "../discord-client";
import { mergePlaceholderIntoPlayer } from "../identities/merge-player";
import { runAchievementsTick } from "../pipeline/scheduler";

// Sync/merge/announce mechanics are tested with just these two rules; the
// rules themselves are covered in achievement-rules.test.ts.
const RULES = pickRules("FIRST_EVENT", "WIN_EVENT");
const { cleanup, addTourney, addPlayer, addResult, awardsFor } =
  makeAchievementFixtures("test-achievements-");

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
  test("every rule has an achievement row", async () => {
    const rows = await dbClient.selectFrom("achievement").select("id").execute();
    expect(rows.map((r) => r.id)).toEqual(
      expect.arrayContaining(Object.keys(ACHIEVEMENT_RULES)),
    );
  });

  test("achievement ids are SCREAMING_SNAKE_CASE", async () => {
    const rows = await dbClient.selectFrom("achievement").select("id").execute();
    for (const { id } of rows) expect(id).toMatch(/^[A-Z0-9]+(_[A-Z0-9]+)*$/);
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

    await syncAchievements(dbClient, RULES);

    expect(await awardsFor(alice.playerId)).toEqual([
      { achievement_id: "FIRST_EVENT", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
      { achievement_id: "WIN_EVENT", tourney_id: t2, achieved_on: "2024-02-10", discord_message_id: null },
    ]);
  });

  test("breaks ties on the same date by tourney id", async () => {
    const tA = await addTourney("same-day-a", "2024-05-01");
    const tB = await addTourney("same-day-b", "2024-05-01");
    const bob = await addPlayer("bob");
    await addResult(bob.identityId, tB, 2);
    await addResult(bob.identityId, tA, 2);

    await syncAchievements(dbClient, RULES);

    expect(await awardsFor(bob.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "FIRST_EVENT", tourney_id: Math.min(tA, tB) }),
    ]);
  });

  test("is idempotent", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 1);

    await syncAchievements(dbClient, RULES);
    const second = await syncAchievements(dbClient, RULES);

    expect(second).toEqual({ inserted: 0, updated: 0, deleted: 0 });
  });

  test("awards achievements from newly imported results", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 3);
    await syncAchievements(dbClient, RULES);

    const t2 = await addTourney("t2", "2024-02-10");
    await addResult(alice.identityId, t2, 1);
    await syncAchievements(dbClient, RULES);

    expect((await awardsFor(alice.playerId)).map((a) => a.achievement_id)).toEqual([
      "FIRST_EVENT",
      "WIN_EVENT",
    ]);
  });

  test("removes awards when the qualifying identity is detached", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 1);
    await syncAchievements(dbClient, RULES);

    await dbClient
      .updateTable("player_identity")
      .set({ player_id: null })
      .where("id", "=", alice.identityId)
      .execute();
    await syncAchievements(dbClient, RULES);

    expect(await awardsFor(alice.playerId)).toEqual([]);
  });

  test("repoints an announced award when its tourney is deleted, keeping the announcement", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const t2 = await addTourney("t2", "2024-02-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 2);
    await addResult(alice.identityId, t2, 2);
    await syncAchievements(dbClient, RULES);
    await markAllAnnounced(alice.playerId, "msg-1");

    await dbClient.deleteFrom("tourney").where("id", "=", t1).execute();
    await syncAchievements(dbClient, RULES);

    expect(await awardsFor(alice.playerId)).toEqual([
      { achievement_id: "FIRST_EVENT", tourney_id: t2, achieved_on: "2024-02-10", discord_message_id: "msg-1" },
    ]);
  });

  test("throws when a rule has no achievement row", async () => {
    await expect(
      syncAchievements(dbClient, { ...ACHIEVEMENT_RULES, "not-in-db": async () => [] }),
    ).rejects.toThrow(/no matching achievement row: \[not-in-db\]/);
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
    await syncAchievements(dbClient, RULES);

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );
    expect(await awardsFor(from.playerId)).toEqual([]);

    await syncAchievements(dbClient, RULES);
    expect(await awardsFor(into.playerId)).toEqual([
      { achievement_id: "FIRST_EVENT", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
      { achievement_id: "WIN_EVENT", tourney_id: t1, achieved_on: "2024-01-10", discord_message_id: null },
    ]);
  });

  test("keeps an announcement from the source when both hold the achievement", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const from = await addPlayer("from");
    const into = await addPlayer("into");
    await addResult(from.identityId, t1, 2);
    await addResult(into.identityId, t1, 3);
    await syncAchievements(dbClient, RULES);
    await markAllAnnounced(from.playerId, "msg-from");

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );

    expect(await awardsFor(into.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "FIRST_EVENT", discord_message_id: "msg-from" }),
    ]);
  });

  test("keeps the target's own announcement over the source's", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const from = await addPlayer("from");
    const into = await addPlayer("into");
    await addResult(from.identityId, t1, 2);
    await addResult(into.identityId, t1, 3);
    await syncAchievements(dbClient, RULES);
    await markAllAnnounced(from.playerId, "msg-from");
    await markAllAnnounced(into.playerId, "msg-into");

    await dbClient.transaction().execute((trx) =>
      mergePlaceholderIntoPlayer(trx, from.playerId, into.playerId),
    );

    expect(await awardsFor(into.playerId)).toEqual([
      expect.objectContaining({ achievement_id: "FIRST_EVENT", discord_message_id: "msg-into" }),
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

  test("announces all of one pending player's achievements in one message", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice"); // wins: 2 achievements
    const bob = await addPlayer("bob"); // 2nd: 1 achievement
    await addResult(alice.identityId, t1, 1);
    await addResult(bob.identityId, t1, 2);
    await syncAchievements(dbClient, RULES);
    const pendingCount = { [alice.playerId]: 2, [bob.playerId]: 1 };

    const first = await announceNextPlayer(dbClient);
    expect([alice.playerId, bob.playerId]).toContain(first);
    const other = first === alice.playerId ? bob.playerId : alice.playerId;

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0].embeds).toHaveLength(pendingCount[first!]!);
    expect(
      new Set((await awardsFor(first!)).map((a) => a.discord_message_id)),
    ).toEqual(new Set(["discord-msg-1"]));
    expect((await awardsFor(other)).every((a) => a.discord_message_id === null)).toBe(true);

    expect(await announceNextPlayer(dbClient)).toBe(other);
    expect(await announceNextPlayer(dbClient)).toBeNull();
  });

  test("picks the player at random rather than by when they were awarded", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    await addResult(alice.identityId, t1, 2);
    await syncAchievements(dbClient, RULES);
    await addResult(bob.identityId, t1, 3);
    await syncAchievements(dbClient, RULES);

    // Alice was awarded first; if selection weren't random she'd always be
    // picked. The chance of 20 random picks all agreeing is ~1 in 500,000.
    const picks = new Set<number | null>();
    for (let i = 0; i < 20; i++) {
      picks.add(await announceNextPlayer(dbClient));
      await dbClient
        .updateTable("player_achievement")
        .set({ discord_message_id: null })
        .where("player_id", "in", [alice.playerId, bob.playerId])
        .execute();
    }
    expect(picks).toEqual(new Set([alice.playerId, bob.playerId]));
  });

  test("scheduled tick syncs but only announces during UK working hours", async () => {
    const t1 = await addTourney("t1", "2024-01-10");
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, t1, 2);

    await runAchievementsTick(dbClient, new Date("2026-01-17T12:00:00Z")); // Saturday
    expect((await awardsFor(alice.playerId)).map((a) => a.achievement_id)).toContain(
      "FIRST_EVENT",
    );
    expect(send).not.toHaveBeenCalled();

    await runAchievementsTick(dbClient, new Date("2026-01-14T12:00:00Z")); // Wednesday
    expect(send).toHaveBeenCalledTimes(1);
  });
});
