import { beforeEach, describe, expect, test, vi } from "vitest";
import { sql } from "kysely";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

vi.mock("../discord-client", () => ({
  getDiscordClient: vi.fn(),
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../discord-client";
import {
  buildRankChangeMessage,
  formatRankChange,
  getRankChanges,
  notifyRankingSubscribers,
} from "./notify-ranking-subscribers";

// Player ids from the shared test tourney data.
const ALICE = 10001;
const BOB = 10002;
const CHARLIE = 10003;

const DISCORD_ALICE = "test-notify-discord-alice";
const DISCORD_BOB = "test-notify-discord-bob";
const DISCORD_CHARLIE = "test-notify-discord-charlie";
const DISCORD_IDS = [DISCORD_ALICE, DISCORD_BOB, DISCORD_CHARLIE];

async function linkDiscordUser(playerId: number, discordUserId: string) {
  await dbClient
    .insertInto("discord_user")
    .values({ discord_user_id: discordUserId, discord_username: discordUserId })
    .execute();
  await dbClient
    .updateTable("player")
    .set({ discord_id: discordUserId })
    .where("id", "=", playerId)
    .execute();
}

// Backdated so the batches a test adds afterwards are always newer.
async function addSubscription(discordUserId: string) {
  await dbClient
    .insertInto("ranking_subscription")
    .values({
      discord_user_id: discordUserId,
      created_at: sql<Date>`CURRENT_TIMESTAMP - interval '1 hour'`,
    })
    .execute();
}

async function addBatch(typeCode: string, ranks: Record<number, number>) {
  const batch = await dbClient
    .insertInto("ranking_snapshot_batch")
    .values({ type_code: typeCode })
    .returning("id")
    .executeTakeFirstOrThrow();
  const rows = Object.entries(ranks).map(([playerId, rank]) => ({
    batch_id: batch.id,
    player_id: Number(playerId),
    rank,
    total_points: 0,
  }));
  if (rows.length > 0) {
    await dbClient.insertInto("ranking_snapshot").values(rows).execute();
  }
}

async function typeName(code: string) {
  const type = await dbClient
    .selectFrom("ranking_snapshot_type")
    .where("code", "=", code)
    .select("name")
    .executeTakeFirstOrThrow();
  return type.name;
}

function mockDiscord(send = vi.fn().mockResolvedValue(undefined)) {
  const fetch = vi.fn(async (id: string) => ({
    send: (content: string) => send(id, content),
  }));
  vi.mocked(getDiscordClient).mockResolvedValue({ users: { fetch } } as any);
  return send;
}

beforeEach(async () => {
  // addTestDataToDb clears players, which frees the player.discord_id FK — so
  // the discord_user cleanup has to run after it.
  await addTestDataToDb(dbClient);
  await dbClient.deleteFrom("ranking_subscription").execute();
  await dbClient
    .deleteFrom("discord_user")
    .where("discord_user_id", "in", DISCORD_IDS)
    .execute();
  await linkDiscordUser(ALICE, DISCORD_ALICE);
  await linkDiscordUser(BOB, DISCORD_BOB);
  await linkDiscordUser(CHARLIE, DISCORD_CHARLIE);
  vi.mocked(getDiscordClient).mockReset();
});

describe("formatRankChange", () => {
  test("rank going down", () => {
    expect(
      formatRankChange({ typeName: "Rolling Year", oldRank: 7, newRank: 11 }),
    ).toBe("Your ranking in Rolling Year has gone down 4 from 7 to 11.");
  });

  test("rank going up", () => {
    expect(
      formatRankChange({ typeName: "Best Resser", oldRank: 5, newRank: 3 }),
    ).toBe("Your ranking in Best Resser has gone up 2 from 5 to 3.");
  });

  test("entering the rankings", () => {
    expect(
      formatRankChange({ typeName: "Masters", oldRank: null, newRank: 12 }),
    ).toBe("You have entered the Masters rankings at 12.");
  });

  test("dropping out of the rankings", () => {
    expect(
      formatRankChange({ typeName: "Masters", oldRank: 9, newRank: null }),
    ).toBe("You have dropped out of the Masters rankings (you were 9).");
  });
});

describe("buildRankChangeMessage", () => {
  test("lists every change, then a player link and how to unsubscribe", () => {
    const change = {
      discordUserId: "1",
      playerId: 42,
      notifiedUpTo: "2026-01-01 00:00:00",
    };
    expect(
      buildRankChangeMessage(
        [
          { ...change, typeName: "Rolling Year", oldRank: 7, newRank: 11 },
          { ...change, typeName: "Best Resser", oldRank: 2, newRank: 3 },
        ],
        "https://site.example",
      ),
    ).toBe(
      [
        "Your ranking in Rolling Year has gone down 4 from 7 to 11.",
        "Your ranking in Best Resser has gone down 1 from 2 to 3.",
        "",
        "[See your rankings](https://site.example/player/42)",
        "-# Use /stopinformingme to stop getting these messages.",
      ].join("\n"),
    );
  });
});

describe("getRankChanges", () => {
  test("reports moves, entries and drop-outs for subscribers only", async () => {
    await addSubscription(DISCORD_ALICE);
    await addSubscription(DISCORD_BOB);
    // Charlie's rank changes too, but Charlie is not subscribed.
    await addBatch("ROLLING_YEAR", { [ALICE]: 7, [BOB]: 1, [CHARLIE]: 2 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 11, [BOB]: 1, [CHARLIE]: 3 });
    await addBatch("BEST_RESSER", { [BOB]: 4 });
    await addBatch("BEST_RESSER", { [ALICE]: 2 });

    const rollingYear = await typeName("ROLLING_YEAR");
    const bestResser = await typeName("BEST_RESSER");
    const changes = await getRankChanges(dbClient);

    expect(
      changes.map(({ discordUserId, typeName, oldRank, newRank }) => ({
        discordUserId,
        typeName,
        oldRank,
        newRank,
      })),
    ).toEqual([
      {
        discordUserId: DISCORD_ALICE,
        typeName: rollingYear,
        oldRank: 7,
        newRank: 11,
      },
      {
        discordUserId: DISCORD_ALICE,
        typeName: bestResser,
        oldRank: null,
        newRank: 2,
      },
      {
        discordUserId: DISCORD_BOB,
        typeName: bestResser,
        oldRank: 4,
        newRank: null,
      },
    ]);
    expect(changes[0]!.playerId).toBe(ALICE);
  });

  test("reports nothing when there is no earlier batch to compare with", async () => {
    await addSubscription(DISCORD_ALICE);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });

    expect(await getRankChanges(dbClient)).toEqual([]);
  });

  test("ignores ranking types that are not displayed", async () => {
    await addSubscription(DISCORD_ALICE);
    await addBatch("BEST_FOREVER", { [ALICE]: 7 });
    await addBatch("BEST_FOREVER", { [ALICE]: 8 });

    expect(await getRankChanges(dbClient)).toEqual([]);
  });

  test("ignores batches from before the subscription", async () => {
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 8 });
    await dbClient
      .insertInto("ranking_subscription")
      .values({ discord_user_id: DISCORD_ALICE })
      .execute();

    expect(await getRankChanges(dbClient)).toEqual([]);
  });
});

describe("notifyRankingSubscribers", () => {
  test("sends one DM per subscriber and does not repeat it", async () => {
    const send = mockDiscord();
    await addSubscription(DISCORD_ALICE);
    await addSubscription(DISCORD_BOB);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7, [BOB]: 1 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 11, [BOB]: 2 });
    await addBatch("BEST_RESSER", { [ALICE]: 2 });
    await addBatch("BEST_RESSER", { [ALICE]: 3 });

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 2,
      failed: 0,
    });
    expect(send).toHaveBeenCalledTimes(2);

    const rollingYear = await typeName("ROLLING_YEAR");
    const bestResser = await typeName("BEST_RESSER");
    const aliceMessage = send.mock.calls.find(
      ([id]) => id === DISCORD_ALICE,
    )![1] as string;
    expect(aliceMessage).toContain(
      `Your ranking in ${rollingYear} has gone down 4 from 7 to 11.\nYour ranking in ${bestResser} has gone down 1 from 2 to 3.`,
    );

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 0,
      failed: 0,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("notifies again when a newer batch changes the rank", async () => {
    const send = mockDiscord();
    await addSubscription(DISCORD_ALICE);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 11 });
    await notifyRankingSubscribers(dbClient);

    await addBatch("ROLLING_YEAR", { [ALICE]: 9 });
    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 1,
      failed: 0,
    });
    expect(send.mock.calls[1]![1]).toContain("has gone up 2 from 11 to 9.");
  });

  test("a failed DM does not stop the others and is retried next time", async () => {
    const send = mockDiscord(
      vi.fn(async (id: string) => {
        if (id === DISCORD_ALICE) throw new Error("Cannot send messages to this user");
      }),
    );
    await addSubscription(DISCORD_ALICE);
    await addSubscription(DISCORD_BOB);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7, [BOB]: 1 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 11, [BOB]: 2 });

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 1,
      failed: 1,
    });
    expect(send).toHaveBeenCalledTimes(2);

    const subscriptions = await dbClient
      .selectFrom("ranking_subscription")
      .select(["discord_user_id", "last_notified_at"])
      .execute();
    const lastNotified = (id: string) =>
      subscriptions.find((s) => s.discord_user_id === id)!.last_notified_at;
    expect(lastNotified(DISCORD_ALICE)).toBeNull();
    expect(lastNotified(DISCORD_BOB)).not.toBeNull();
  });

  test("does not touch Discord when nothing changed", async () => {
    await addSubscription(DISCORD_ALICE);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 0,
      failed: 0,
    });
    expect(getDiscordClient).not.toHaveBeenCalled();
  });
});
