import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";
import { searchDiscordUsersByName, searchDiscordUsersRoute } from "./discord-id";
import { searchPlayersHandler, searchPlayersRoute } from "./players";

// Distinctive names so the shared test data can't match these searches.
const DISCORD_PREFIX = "test-search-discord-";
const PLAYER_NAMES = [
  "Zbigniew (washed up weak player)",
  "Zbigniew",
  "Pinwheel (Ixworth)",
  "Quorvath Smith",
];

function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    await next();
  });
  app.openapi(searchPlayersRoute, searchPlayersHandler);
  app.openapi(searchDiscordUsersRoute, searchDiscordUsersByName);
  return app;
}

async function searchPlayers(text: string) {
  const res = await makeApp().request(
    `/search-players?text=${encodeURIComponent(text)}`,
  );
  expect(res.status).toBe(200);
  return (await res.json()) as { id: number; name: string }[];
}

async function searchDiscordUsers(text: string) {
  const res = await makeApp().request(
    `/search-discord-users?text=${encodeURIComponent(text)}`,
  );
  return res;
}

async function discordNames(text: string) {
  const res = await searchDiscordUsers(text);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { discord_display_name: string | null }[];
  return body.map((u) => u.discord_display_name);
}

async function addPlayer(name: string, discordId?: string) {
  return dbClient
    .insertInto("player")
    .values({ name, discord_id: discordId ?? null })
    .returning("id")
    .executeTakeFirstOrThrow();
}

async function addDiscordUser(
  id: string,
  username: string,
  displayName: string | null,
) {
  await dbClient
    .insertInto("discord_user")
    .values({
      discord_user_id: `${DISCORD_PREFIX}${id}`,
      discord_username: username,
      discord_display_name: displayName,
      discord_nickname: displayName,
    })
    .execute();
}

beforeEach(async () => {
  await dbClient.deleteFrom("player").where("name", "in", PLAYER_NAMES).execute();
  await dbClient
    .deleteFrom("discord_user")
    .where("discord_user_id", "like", `${DISCORD_PREFIX}%`)
    .execute();

  await addDiscordUser("zbig", "kedarzz69", "Zbigniew (washed up weak player)");
  await addDiscordUser("pin", "pinwheelio", "Pinwheel (Ixworth)");
  await addDiscordUser("unlinked", "quorvath_q", null);
});

describe("GET /search-players", () => {
  test("finds a name with brackets from its first word", async () => {
    await addPlayer("Zbigniew (washed up weak player)", `${DISCORD_PREFIX}zbig`);
    const names = (await searchPlayers("zbigniew")).map((p) => p.name);
    expect(names).toContain("Zbigniew (washed up weak player)");
  });

  test("finds a word inside the brackets", async () => {
    await addPlayer("Pinwheel (Ixworth)");
    const names = (await searchPlayers("ixworth")).map((p) => p.name);
    expect(names).toContain("Pinwheel (Ixworth)");
  });

  test("matches word prefixes while typing", async () => {
    await addPlayer("Pinwheel (Ixworth)");
    const names = (await searchPlayers("ixw")).map((p) => p.name);
    expect(names).toContain("Pinwheel (Ixworth)");
  });

  test("finds a player by their linked Discord username", async () => {
    await addPlayer("Zbigniew (washed up weak player)", `${DISCORD_PREFIX}zbig`);
    const names = (await searchPlayers("kedarzz")).map((p) => p.name);
    expect(names).toContain("Zbigniew (washed up weak player)");
  });

  test("still finds a close typo by trigram similarity", async () => {
    await addPlayer("Quorvath Smith");
    const names = (await searchPlayers("Quorvath Smiht")).map((p) => p.name);
    expect(names).toContain("Quorvath Smith");
  });

  test("ranks an exact name above a longer one", async () => {
    await addPlayer("Zbigniew (washed up weak player)");
    await addPlayer("Zbigniew");
    const names = (await searchPlayers("zbigniew")).map((p) => p.name);
    expect(names.slice(0, 2)).toEqual([
      "Zbigniew",
      "Zbigniew (washed up weak player)",
    ]);
  });

  test("returns nothing for blank or punctuation-only text", async () => {
    await addPlayer("Pinwheel (Ixworth)");
    expect(await searchPlayers("")).toEqual([]);
    expect(await searchPlayers("()")).toEqual([]);
  });
});

describe("GET /search-discord-users", () => {
  test("finds a display name with brackets from its first word", async () => {
    expect(await discordNames("zbigniew")).toContain(
      "Zbigniew (washed up weak player)",
    );
  });

  test("finds a word inside the brackets", async () => {
    expect(await discordNames("ixworth")).toContain("Pinwheel (Ixworth)");
  });

  test("matches a prefix of the username", async () => {
    const res = await searchDiscordUsers("quorv");
    const body = (await res.json()) as { discord_username: string | null }[];
    expect(body.map((u) => u.discord_username)).toContain("quorvath_q");
  });

  test("does not return the search vector", async () => {
    const res = await searchDiscordUsers("ixworth");
    const [user] = (await res.json()) as Record<string, unknown>[];
    expect(user).not.toHaveProperty("search_vector");
  });

  test("tsquery syntax in the text doesn't cause an error", async () => {
    const res = await searchDiscordUsers("ixworth & | ! :* <->");
    expect(res.status).toBe(200);
  });

  test("returns nothing for punctuation-only text", async () => {
    expect(await discordNames("()")).toEqual([]);
  });

  test("rejects blank text", async () => {
    expect((await searchDiscordUsers(" ")).status).toBe(400);
  });
});
