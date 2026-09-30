import { beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";

vi.mock("../discord-client", () => ({
  getDiscordClient: vi.fn(),
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import {
  subscribe,
  subscribeReply,
  unsubscribe,
  unsubscribeReply,
} from "./subscription-commands";

const ALICE = 10001;
const DISCORD_LINKED = "test-subscription-discord-linked";
const DISCORD_UNLINKED = "test-subscription-discord-unlinked";

async function subscriptions() {
  return dbClient
    .selectFrom("ranking_subscription")
    .select("discord_user_id")
    .execute();
}

beforeEach(async () => {
  // addTestDataToDb clears players, which frees the player.discord_id FK — so
  // the discord_user cleanup has to run after it.
  await addTestDataToDb(dbClient);
  await dbClient.deleteFrom("ranking_subscription").execute();
  await dbClient
    .deleteFrom("discord_user")
    .where("discord_user_id", "=", DISCORD_LINKED)
    .execute();
  await dbClient
    .insertInto("discord_user")
    .values({ discord_user_id: DISCORD_LINKED, discord_username: "linked" })
    .execute();
  await dbClient
    .updateTable("player")
    .set({ discord_id: DISCORD_LINKED })
    .where("id", "=", ALICE)
    .execute();
});

describe("subscribe", () => {
  test("stores the subscription and reports a linked player", async () => {
    expect(await subscribe(dbClient, DISCORD_LINKED)).toEqual({ linked: true });
    expect(await subscriptions()).toEqual([
      { discord_user_id: DISCORD_LINKED },
    ]);
  });

  test("still subscribes a user with no linked player", async () => {
    expect(await subscribe(dbClient, DISCORD_UNLINKED)).toEqual({
      linked: false,
    });
    expect(await subscriptions()).toEqual([
      { discord_user_id: DISCORD_UNLINKED },
    ]);
  });

  test("is idempotent", async () => {
    await subscribe(dbClient, DISCORD_LINKED);
    await subscribe(dbClient, DISCORD_LINKED);
    expect(await subscriptions()).toHaveLength(1);
  });
});

describe("unsubscribe", () => {
  test("removes an existing subscription", async () => {
    await subscribe(dbClient, DISCORD_LINKED);
    expect(await unsubscribe(dbClient, DISCORD_LINKED)).toEqual({
      wasSubscribed: true,
    });
    expect(await subscriptions()).toEqual([]);
  });

  test("reports when there was nothing to remove", async () => {
    expect(await unsubscribe(dbClient, DISCORD_LINKED)).toEqual({
      wasSubscribed: false,
    });
  });
});

describe("replies", () => {
  test("an unlinked subscriber is told nothing will arrive yet", () => {
    expect(subscribeReply({ linked: true })).not.toContain("linked");
    expect(subscribeReply({ linked: false })).toContain(
      "can't find a player linked to your Discord account",
    );
  });

  test("unsubscribing says whether there was a subscription", () => {
    expect(unsubscribeReply({ wasSubscribed: true })).toContain(
      "You're unsubscribed",
    );
    expect(unsubscribeReply({ wasSubscribed: false })).toContain(
      "You weren't subscribed",
    );
  });
});
