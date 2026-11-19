import { addDays, format, subMonths } from "date-fns";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

vi.mock("../discord-client", () => ({
  getDiscordClient: vi.fn(),
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { cardSchema } from "../buried/2026/cards";
import { generateBuried } from "../buried";
import { sendBuriedDms, sendBuriedTestDm } from "../buried/send-dms";
import { getDiscordClient } from "../discord-client";

const ALICE = 10001;
const BOB = 10002;
const EVE = 10005;
const YEAR = 2026;

// The shared fixtures are dated relative to today (1-3 months ago, plus one 13
// months ago), so the window is too.
const window = {
  start: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
  end: format(addDays(new Date(), 1), "yyyy-MM-dd"),
};

const DISCORD_ALICE = "test-buried-discord-alice";
const DISCORD_BOB = "test-buried-discord-bob";

async function linkDiscordUser(playerId: number, discordUserId: string) {
  await dbClient
    .insertInto("discord_user")
    .values({ discord_user_id: discordUserId, discord_username: discordUserId })
    .onConflict((oc) => oc.doNothing())
    .execute();
  await dbClient.updateTable("player").set({ discord_id: discordUserId }).where("id", "=", playerId).execute();
}

beforeEach(async () => {
  await dbClient.deleteFrom("buried_player").execute();
  await addTestDataToDb(dbClient);
  await dbClient.deleteFrom("discord_user").where("discord_user_id", "like", "test-buried-%").execute();
});

const deckOf = async (playerId: number) =>
  dbClient
    .selectFrom("buried_player")
    .where("player_id", "=", playerId)
    .where("year", "=", YEAR)
    .selectAll()
    .executeTakeFirstOrThrow();

describe("generateBuried", () => {
  test("creates a schema-valid deck for every player in the window", async () => {
    const result = await generateBuried(dbClient, YEAR, { window });
    expect(result.players).toBe(5);

    const alice = await deckOf(ALICE);
    const cards = alice.cards as { key: string; events?: { name: string }[] }[];
    expect(cards[0]!.key).toBe("INTRO");
    expect(cards.at(-1)!.key).toBe("SUMMARY");
    for (const card of cards) expect(cardSchema.safeParse(card).success).toBe(true);

    // Alice also won tourney 4, but that's 13 months ago — outside the window.
    const won = cards.find((c) => c.key === "EVENTS_WON")!;
    expect(won.events!.map((e) => e.name)).toEqual(["Tourney 1"]);
    expect(alice.summary_image_key).toBeNull();
  });

  test("Bob's wins and podiums come from in-window events only", async () => {
    await generateBuried(dbClient, YEAR, { window });
    const cards = (await deckOf(BOB)).cards as { key: string; events?: { name: string; place?: number }[] }[];
    const won = cards.find((c) => c.key === "EVENTS_WON")!;
    expect(won.events!.map((e) => e.name)).toEqual(["Tourney 2 (masters)"]);
    const podiums = cards.find((c) => c.key === "PODIUMS")!;
    expect(podiums.events!.map((e) => e.place)).toEqual([3, 1, 2]);
  });

  test("regenerating keeps dm_sent_at and removes decks that no longer qualify", async () => {
    await generateBuried(dbClient, YEAR, { window });
    const sentAt = new Date("2026-12-02T10:00:00Z");
    await dbClient.updateTable("buried_player").set({ dm_sent_at: sentAt }).where("player_id", "=", ALICE).execute();

    // Eve's only in-window result goes away.
    await dbClient
      .deleteFrom("result")
      .where("player_identity_id", "in", dbClient.selectFrom("player_identity").select("id").where("player_id", "=", EVE))
      .where("tourney_id", "=", 2)
      .execute();

    const result = await generateBuried(dbClient, YEAR, { window });
    expect(result.removed).toBe(1);
    expect((await deckOf(ALICE)).dm_sent_at).toEqual(sentAt);
    expect(
      await dbClient.selectFrom("buried_player").where("player_id", "=", EVE).selectAll().executeTakeFirst(),
    ).toBeUndefined();
  });

  test("organisers without results get a deck", async () => {
    await dbClient.deleteFrom("result").where("player_identity_id", "in", dbClient.selectFrom("player_identity").select("id").where("player_id", "=", BOB)).execute();
    await linkDiscordUser(BOB, DISCORD_BOB);
    await dbClient.insertInto("tourney_organiser").values({ tourney_id: 1, discord_user_id: DISCORD_BOB }).execute();

    await generateBuried(dbClient, YEAR, { window });
    const keys = ((await deckOf(BOB)).cards as { key: string }[]).map((c) => c.key);
    expect(keys).toEqual(["INTRO", "ORGANISED", "SUMMARY"]);
  });

  test("throws for a year with no generator", async () => {
    await expect(generateBuried(dbClient, 1999, { window })).rejects.toThrow("No Buried generator");
  });
});

describe("sendBuriedDms", () => {
  const mockDiscord = (failFor: string[] = []) => {
    const send = vi.fn(async () => ({}));
    const fetch = vi.fn(async (id: string) => {
      if (failFor.includes(id)) throw new Error("Cannot send messages to this user");
      return { send };
    });
    vi.mocked(getDiscordClient).mockResolvedValue({ users: { fetch } } as never);
    return { send, fetch };
  };

  test("DMs linked players once, skips unlinked, counts failures", async () => {
    await linkDiscordUser(ALICE, DISCORD_ALICE);
    await linkDiscordUser(BOB, DISCORD_BOB);
    await generateBuried(dbClient, YEAR, { window });

    const { send } = mockDiscord([DISCORD_BOB]);
    expect(await sendBuriedDms(dbClient, YEAR)).toEqual({ sent: 1, failed: 1, skipped: 3 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]).toEqual([expect.stringContaining(`https://site.example/player/${ALICE}/buried/${YEAR}`)]);
    expect((await deckOf(ALICE)).dm_sent_at).not.toBeNull();
    expect((await deckOf(BOB)).dm_sent_at).toBeNull();

    // A re-run retries Bob only.
    const retry = mockDiscord();
    expect(await sendBuriedDms(dbClient, YEAR)).toEqual({ sent: 1, failed: 0, skipped: 3 });
    expect(retry.fetch).toHaveBeenCalledWith(DISCORD_BOB);
  });

  test("test DM goes to the caller only and marks nothing sent", async () => {
    await linkDiscordUser(ALICE, DISCORD_ALICE);
    await generateBuried(dbClient, YEAR, { window });
    const { fetch } = mockDiscord();

    expect(await sendBuriedTestDm(dbClient, YEAR, DISCORD_ALICE)).toEqual({ playerId: ALICE });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(DISCORD_ALICE);
    expect((await deckOf(ALICE)).dm_sent_at).toBeNull();
  });
});
