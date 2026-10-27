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
  buildRankChangeMessages,
  formatNeighbours,
  formatRankChange,
  getRankChanges,
  notifyRankingSubscribers,
  type RankChange,
} from "./notify-ranking-subscribers";

// Player ids from the shared test tourney data.
const ALICE = 10001;
const BOB = 10002;
const CHARLIE = 10003;
const DAVID = 10004;
const EVE = 10005;

const DISCORD_ALICE = "test-notify-discord-alice";
const DISCORD_BOB = "test-notify-discord-bob";
const DISCORD_CHARLIE = "test-notify-discord-charlie";
const DISCORD_IDS = [DISCORD_ALICE, DISCORD_BOB, DISCORD_CHARLIE];

const TEAM_NAMES = ["test-notify-Alpha", "test-notify-Beta", "test-notify-Gamma"];

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
    total_points: 100 - rank,
  }));
  if (rows.length > 0) {
    await dbClient.insertInto("ranking_snapshot").values(rows).execute();
  }
}

async function addTeam(
  name: string,
  members: number[],
  { joinDate = "2020-01-01", leftDate }: { joinDate?: string; leftDate?: string } = {},
) {
  const team = await dbClient
    .insertInto("team")
    .values({ name })
    .returning("id")
    .executeTakeFirstOrThrow();
  await dbClient
    .insertInto("membership")
    .values(
      members.map((player_id) => ({
        player_id,
        team_id: team.id,
        join_date: joinDate as any,
        left_date: (leftDate ?? null) as any,
      })),
    )
    .execute();
  return team.id;
}

async function addTeamBatch(typeCode: string, ranks: Record<number, number>) {
  const batch = await dbClient
    .insertInto("team_ranking_snapshot_batch")
    .values({ type_code: typeCode })
    .returning("id")
    .executeTakeFirstOrThrow();
  const rows = Object.entries(ranks).map(([teamId, rank]) => ({
    batch_id: batch.id,
    team_id: Number(teamId),
    rank,
    total_points: 100 - rank,
  }));
  if (rows.length > 0) {
    await dbClient.insertInto("team_ranking_snapshot").values(rows).execute();
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

function summarise(changes: RankChange[]) {
  return changes.map(({ discordUserId, teamName, typeName, oldRank, newRank }) => ({
    discordUserId,
    teamName,
    typeName,
    oldRank,
    newRank,
  }));
}

beforeEach(async () => {
  // Team snapshots reference teams, so they go first. addTestDataToDb clears
  // players (cascading memberships), which frees the player.discord_id FK — so
  // the discord_user cleanup has to run after it.
  await dbClient.deleteFrom("team_ranking_snapshot").execute();
  await dbClient.deleteFrom("team_ranking_snapshot_batch").execute();
  await dbClient.deleteFrom("team").where("name", "in", TEAM_NAMES).execute();
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
  const player = { teamName: null };

  test("rank falling", () => {
    expect(
      formatRankChange({ ...player, typeName: "Rolling Year", oldRank: 7, newRank: 11 }),
    ).toBe("Your ranking in Rolling Year has *fallen* 4 places to 11th.");
  });

  test("rank rising", () => {
    expect(
      formatRankChange({ ...player, typeName: "Best Resser", oldRank: 5, newRank: 3 }),
    ).toBe("Your ranking in Best Resser has *risen* 2 places to 3rd.");
  });

  test("moving a single place", () => {
    expect(
      formatRankChange({ ...player, typeName: "Best Resser", oldRank: 2, newRank: 1 }),
    ).toBe("Your ranking in Best Resser has *risen* 1 place to 1st.");
  });

  test("entering the rankings", () => {
    expect(
      formatRankChange({ ...player, typeName: "Best Guild", oldRank: null, newRank: 12 }),
    ).toBe("You have entered the Best Guild rankings at 12th.");
  });

  test("dropping out of the rankings", () => {
    expect(
      formatRankChange({ ...player, typeName: "Best Guild", oldRank: 9, newRank: null }),
    ).toBe("You have dropped out of the Best Guild rankings (you were 9th).");
  });

  test("team rank moving", () => {
    expect(
      formatRankChange({ teamName: "Alpha", typeName: "Rolling Year", oldRank: 8, newRank: 5 }),
    ).toBe("**Alpha**'s ranking in Rolling Year has *risen* 3 places to 5th.");
  });

  test("team entering the rankings", () => {
    expect(
      formatRankChange({ teamName: "Alpha", typeName: "Rolling Year", oldRank: null, newRank: 5 }),
    ).toBe("**Alpha** has entered the Rolling Year team rankings at 5th.");
  });

  test("team dropping out of the rankings", () => {
    expect(
      formatRankChange({ teamName: "Alpha", typeName: "Rolling Year", oldRank: 9, newRank: null }),
    ).toBe("**Alpha** has dropped out of the Rolling Year team rankings (was 9th).");
  });

  test("escapes markdown in team names", () => {
    expect(
      formatRankChange({ teamName: "*Stars*", typeName: "Rolling Year", oldRank: 2, newRank: 1 }),
    ).toBe("**\\*Stars\\***'s ranking in Rolling Year has *risen* 1 place to 1st.");
  });
});

describe("formatNeighbours", () => {
  test("quotes each row and bolds the subscriber's own", () => {
    expect(
      formatNeighbours(
        [
          { id: 1, name: "Bob", rank: 2, totalPoints: 50 },
          { id: 2, name: "Alice", rank: 3, totalPoints: 42.123 },
          { id: 3, name: "Charlie_", rank: 4, totalPoints: 40 },
        ],
        2,
      ),
    ).toEqual([
      "> 2nd Bob (50.00 pts)",
      "> **3rd Alice (42.12 pts)**",
      "> 4th Charlie\\_ (40.00 pts)",
    ]);
  });
});

describe("buildRankChangeMessages", () => {
  const base = {
    discordUserId: "1",
    playerId: 42,
    teamId: null,
    teamName: null,
    batchId: 1,
    notifiedUpTo: "2026-01-01 00:00:00",
    neighbours: [],
  };

  test("lists every change with its snippet, then links and how to unsubscribe", () => {
    expect(
      buildRankChangeMessages(
        [
          {
            ...base,
            typeName: "Rolling Year",
            oldRank: 7,
            newRank: 11,
            neighbours: [
              { id: 7, name: "Bob", rank: 10, totalPoints: 12 },
              { id: 42, name: "Alice", rank: 11, totalPoints: 11 },
            ],
          },
          { ...base, typeName: "Best Resser", oldRank: 2, newRank: null },
          {
            ...base,
            teamId: 5,
            teamName: "Alpha",
            typeName: "Rolling Year",
            oldRank: 3,
            newRank: 2,
            neighbours: [
              { id: 9, name: "Beta", rank: 1, totalPoints: 80 },
              { id: 5, name: "Alpha", rank: 2, totalPoints: 70 },
            ],
          },
        ],
        "https://site.example",
      ),
    ).toEqual([
      [
        "Your ranking in Rolling Year has *fallen* 4 places to 11th.",
        "> 10th Bob (12.00 pts)",
        "> **11th Alice (11.00 pts)**",
        "",
        "You have dropped out of the Best Resser rankings (you were 2nd).",
        "",
        "**Alpha**'s ranking in Rolling Year has *risen* 1 place to 2nd.",
        "> 1st Beta (80.00 pts)",
        "> **2nd Alpha (70.00 pts)**",
        "",
        "[See your rankings](https://site.example/player/42)",
        "[See Alpha](https://site.example/team/5)",
        "-# Use /stopinformingme to stop getting these messages.",
      ].join("\n"),
    ]);
  });

  test("splits between changes when too long for one Discord message", () => {
    const neighbours = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      name: "x".repeat(80),
      rank: i + 1,
      totalPoints: 1,
    }));
    const changes = Array.from({ length: 10 }, () => ({
      ...base,
      typeName: "Rolling Year",
      oldRank: 1,
      newRank: 2,
      neighbours,
    }));

    const messages = buildRankChangeMessages(changes, "https://site.example");

    expect(messages.length).toBeGreaterThan(1);
    for (const message of messages) {
      expect(message.length).toBeLessThanOrEqual(2000);
      expect(message.startsWith("Your ranking") || message.startsWith("[See")).toBe(true);
    }
    expect(messages.join("\n\n").match(/Your ranking/g)).toHaveLength(10);
    expect(messages.at(-1)).toContain("/stopinformingme");
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

    expect(summarise(changes)).toEqual([
      {
        discordUserId: DISCORD_ALICE,
        teamName: null,
        typeName: rollingYear,
        oldRank: 7,
        newRank: 11,
      },
      {
        discordUserId: DISCORD_ALICE,
        teamName: null,
        typeName: bestResser,
        oldRank: null,
        newRank: 2,
      },
      {
        discordUserId: DISCORD_BOB,
        teamName: null,
        typeName: bestResser,
        oldRank: 4,
        newRank: null,
      },
    ]);
    expect(changes[0]!.playerId).toBe(ALICE);
    expect(changes[2]!.neighbours).toEqual([]);
  });

  test("includes up to two places either side in the latest rankings", async () => {
    await addSubscription(DISCORD_ALICE);
    await addSubscription(DISCORD_BOB);
    await addBatch("ROLLING_YEAR", { [ALICE]: 5, [BOB]: 2 });
    await addBatch("ROLLING_YEAR", {
      [BOB]: 1,
      [CHARLIE]: 2,
      [ALICE]: 3,
      [DAVID]: 4,
      [EVE]: 5,
    });

    const changes = await getRankChanges(dbClient);
    const neighboursOf = (id: string) =>
      changes
        .find((c) => c.discordUserId === id)!
        .neighbours.map(({ name, rank, totalPoints }) => ({ name, rank, totalPoints }));

    expect(neighboursOf(DISCORD_ALICE)).toEqual([
      { name: "Bob", rank: 1, totalPoints: 99 },
      { name: "Charlie", rank: 2, totalPoints: 98 },
      { name: "Alice", rank: 3, totalPoints: 97 },
      { name: "David", rank: 4, totalPoints: 96 },
      { name: "Eve", rank: 5, totalPoints: 95 },
    ]);
    // Nobody above first place.
    expect(neighboursOf(DISCORD_BOB).map((n) => n.name)).toEqual([
      "Bob",
      "Charlie",
      "Alice",
    ]);
  });

  test("ties do not widen the snippet", async () => {
    await addSubscription(DISCORD_ALICE);
    await addBatch("ROLLING_YEAR", { [ALICE]: 5 });
    await addBatch("ROLLING_YEAR", {
      [ALICE]: 1,
      [BOB]: 1,
      [CHARLIE]: 1,
      [DAVID]: 1,
      [EVE]: 1,
    });

    const [change] = await getRankChanges(dbClient);
    // Alphabetical among ties: Alice, Bob, Charlie, David, Eve.
    expect(change!.neighbours.map((n) => n.name)).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  test("reports moves of teams the subscriber is currently in", async () => {
    await addSubscription(DISCORD_ALICE);
    await addSubscription(DISCORD_BOB);
    // Alice left Gamma for Alpha, so Gamma's moves are not hers any more.
    const gamma = await addTeam("test-notify-Gamma", [ALICE], {
      leftDate: "2025-01-01",
    });
    const alpha = await addTeam("test-notify-Alpha", [ALICE], {
      joinDate: "2025-01-01",
    });
    const beta = await addTeam("test-notify-Beta", [BOB, CHARLIE]);
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 3, [beta]: 1, [gamma]: 2 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 1, [beta]: 2, [gamma]: 3 });

    const rollingYear = await typeName("ROLLING_YEAR");
    const changes = await getRankChanges(dbClient);

    expect(summarise(changes)).toEqual([
      {
        discordUserId: DISCORD_ALICE,
        teamName: "test-notify-Alpha",
        typeName: rollingYear,
        oldRank: 3,
        newRank: 1,
      },
      {
        discordUserId: DISCORD_BOB,
        teamName: "test-notify-Beta",
        typeName: rollingYear,
        oldRank: 1,
        newRank: 2,
      },
    ]);
    expect(changes[0]!.teamId).toBe(alpha);
    expect(changes[0]!.neighbours.map((n) => n.name)).toEqual([
      "test-notify-Alpha",
      "test-notify-Beta",
      "test-notify-Gamma",
    ]);
  });

  test("lists player changes before team changes", async () => {
    await addSubscription(DISCORD_ALICE);
    const alpha = await addTeam("test-notify-Alpha", [ALICE]);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 3 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 6 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 2 });

    const changes = await getRankChanges(dbClient);
    expect(changes.map((c) => c.teamName)).toEqual([null, "test-notify-Alpha"]);
    // Covers the team batch, which was created after the player one.
    const teamBatch = await dbClient
      .selectFrom("team_ranking_snapshot_batch")
      .select(sql<string>`max(created_at)::text`.as("createdAt"))
      .executeTakeFirstOrThrow();
    expect(changes.every((c) => c.notifiedUpTo === teamBatch.createdAt)).toBe(true);
  });

  test("reports nothing when there is no earlier batch to compare with", async () => {
    await addSubscription(DISCORD_ALICE);
    const alpha = await addTeam("test-notify-Alpha", [ALICE]);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 3 });

    expect(await getRankChanges(dbClient)).toEqual([]);
  });

  test("ignores ranking types that are not displayed", async () => {
    await addSubscription(DISCORD_ALICE);
    const alpha = await addTeam("test-notify-Alpha", [ALICE]);
    await addBatch("BEST_FOREVER", { [ALICE]: 7 });
    await addBatch("BEST_FOREVER", { [ALICE]: 8 });
    await addTeamBatch("BEST_FOREVER", { [alpha]: 3 });
    await addTeamBatch("BEST_FOREVER", { [alpha]: 4 });

    expect(await getRankChanges(dbClient)).toEqual([]);
  });

  test("ignores batches from before the subscription", async () => {
    const alpha = await addTeam("test-notify-Alpha", [ALICE]);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 8 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 3 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 4 });
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
      `Your ranking in ${rollingYear} has *fallen* 4 places to 11th.`,
    );
    expect(aliceMessage).toContain("> **11th Alice (89.00 pts)**");
    expect(aliceMessage).toContain(
      `Your ranking in ${bestResser} has *fallen* 1 place to 3rd.`,
    );

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 0,
      failed: 0,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("sends a DM when only a team moved, and does not repeat it", async () => {
    const send = mockDiscord();
    await addSubscription(DISCORD_ALICE);
    const alpha = await addTeam("test-notify-Alpha", [ALICE]);
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addBatch("ROLLING_YEAR", { [ALICE]: 7 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 3 });
    await addTeamBatch("ROLLING_YEAR", { [alpha]: 2 });

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 1,
      failed: 0,
    });
    const message = send.mock.calls[0]![1] as string;
    expect(message).not.toContain("Your ranking");
    expect(message).toContain("**test-notify-Alpha**'s ranking in");
    expect(message).toContain(`[See test-notify-Alpha](https://site.example/team/${alpha})`);

    expect(await notifyRankingSubscribers(dbClient)).toEqual({
      sent: 0,
      failed: 0,
    });
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
    expect(send.mock.calls[1]![1]).toContain("has *risen* 2 places to 9th.");
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
