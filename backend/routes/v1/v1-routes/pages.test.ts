import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../../db-client";
import type { AppEnv } from "../../../hono-env";

vi.mock("../../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  ACHIEVEMENT_AIDE_ROLE_ID: "aide-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../../logic/discord-client.js";
import {
  createPageHandler,
  createPageRoute,
  deletePageHandler,
  deletePageRoute,
  getPageHandler,
  getPageRoute,
  getPagesHandler,
  getPagesRoute,
  getPageVersionHandler,
  getPageVersionRoute,
  getPageVersionsHandler,
  getPageVersionsRoute,
  savePageVersionHandler,
  savePageVersionRoute,
  updatePageSettingsHandler,
  updatePageSettingsRoute,
} from "./pages";

function mockRankingReporter(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: (id: string) => hasRole && id === "reporter-role-id" } },
          }),
        },
      }),
    },
  } as any);
}

function makeApp() {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("db", dbClient);
    c.set("jwtPayload", { id: "test-editor" } as any);
    await next();
  });
  app.openapi(getPagesRoute, getPagesHandler);
  app.openapi(getPageRoute, getPageHandler);
  app.openapi(getPageVersionsRoute, getPageVersionsHandler);
  app.openapi(getPageVersionRoute, getPageVersionHandler);
  app.openapi(createPageRoute, createPageHandler);
  app.openapi(savePageVersionRoute, savePageVersionHandler);
  app.openapi(updatePageSettingsRoute, updatePageSettingsHandler);
  app.openapi(deletePageRoute, deletePageHandler);
  return app;
}

function send(method: string, path: string, body?: object) {
  return makeApp().request(path, {
    method,
    headers: { "content-type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  });
}

const URL_PREFIX = "/test-cms";

const content = (t: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
});

const fields = (overrides: object = {}) => ({
  url: `${URL_PREFIX}-page`,
  title: "Test Page",
  description: "A test page",
  content: content("Hello"),
  ...overrides,
});

async function createPage(overrides: object = {}): Promise<number> {
  const res = await send("POST", "/pages", fields(overrides));
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

beforeEach(() => mockRankingReporter(true));

afterEach(async () => {
  await dbClient.deleteFrom("page").where("url", "like", `${URL_PREFIX}%`).execute();
});

describe("POST /pages", () => {
  test("creates the page with version 1, normalising the URL", async () => {
    const id = await createPage({ url: ` ${URL_PREFIX}-page/ `, nav_order: 3 });

    const res = await send("GET", `/pages/${id}`);
    expect(res.status).toBe(200);
    const page = (await res.json()) as any;
    expect(page).toMatchObject({ id, visible: true, nav_order: 3 });
    expect(page.latest).toMatchObject({
      version: 1,
      url: `${URL_PREFIX}-page`,
      title: "Test Page",
      description: "A test page",
      content: content("Hello"),
      created_by: "test-editor",
    });
  });

  test.each([
    ["reserved", "/teams/mine", /already used by the site/],
    ["badly formed", "/Test-CMS", /lowercase/],
    ["the homepage", "/", /homepage/],
  ])("rejects a %s URL", async (_name, url, message) => {
    const res = await send("POST", "/pages", fields({ url }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(message);
  });

  test("rejects javascript: links", async () => {
    const res = await send(
      "POST",
      "/pages",
      fields({
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
            },
          ],
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  test("rejects a URL another page already uses", async () => {
    await createPage();
    const res = await send("POST", "/pages", fields());
    expect(res.status).toBe(409);
  });

  test("is forbidden without the ranking reporter role", async () => {
    mockRankingReporter(false);
    const res = await send("POST", "/pages", fields());
    expect(res.status).toBe(403);
  });
});

describe("POST /pages/{id}/versions", () => {
  test("appends a new version and moves the page URL", async () => {
    const id = await createPage();
    const res = await send("POST", `/pages/${id}/versions`, {
      ...fields({ url: `${URL_PREFIX}-renamed`, title: "Renamed", content: content("v2") }),
      base_version: 1,
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ version: 2 });

    const page = (await (await send("GET", `/pages/${id}`)).json()) as any;
    expect(page.latest).toMatchObject({ version: 2, url: `${URL_PREFIX}-renamed`, title: "Renamed", content: content("v2") });

    const history = (await (await send("GET", `/pages/${id}/versions`)).json()) as any[];
    expect(history.map((v) => [v.version, v.url])).toEqual([
      [2, `${URL_PREFIX}-renamed`],
      [1, `${URL_PREFIX}-page`],
    ]);

    const v1 = (await (await send("GET", `/pages/${id}/versions/1`)).json()) as any;
    expect(v1).toMatchObject({ version: 1, content: content("Hello") });

    const pageRow = await dbClient.selectFrom("page").select("url").where("id", "=", id).executeTakeFirstOrThrow();
    expect(pageRow.url).toBe(`${URL_PREFIX}-renamed`);
  });

  test("rejects a save based on an out-of-date version", async () => {
    const id = await createPage();
    expect((await send("POST", `/pages/${id}/versions`, { ...fields(), base_version: 1 })).status).toBe(201);

    const res = await send("POST", `/pages/${id}/versions`, { ...fields({ title: "Stale" }), base_version: 1 });
    expect(res.status).toBe(409);
    expect(((await res.json()) as any).latest_version).toBe(2);

    const page = (await (await send("GET", `/pages/${id}`)).json()) as any;
    expect(page.latest.version).toBe(2);
    expect(page.latest.title).toBe("Test Page");
  });

  test("rejects moving onto another page's URL", async () => {
    await createPage({ url: `${URL_PREFIX}-a` });
    const b = await createPage({ url: `${URL_PREFIX}-b` });
    const res = await send("POST", `/pages/${b}/versions`, { ...fields({ url: `${URL_PREFIX}-a` }), base_version: 1 });
    expect(res.status).toBe(409);

    const versions = await dbClient.selectFrom("page_version").select("version").where("page_id", "=", b).execute();
    expect(versions).toHaveLength(1);
  });

  test("404s for a missing page", async () => {
    const res = await send("POST", `/pages/999999/versions`, { ...fields(), base_version: 1 });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /pages/{id}", () => {
  test("changes visibility and nav order without adding a version", async () => {
    const id = await createPage();
    const res = await send("PATCH", `/pages/${id}`, { visible: false, nav_order: 5 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id, visible: false, nav_order: 5 });

    const cleared = await send("PATCH", `/pages/${id}`, { nav_order: null });
    expect(await cleared.json()).toEqual({ id, visible: false, nav_order: null });

    const versions = await dbClient.selectFrom("page_version").select("version").where("page_id", "=", id).execute();
    expect(versions).toHaveLength(1);
  });

  test("rejects an empty update", async () => {
    const id = await createPage();
    expect((await send("PATCH", `/pages/${id}`, {})).status).toBe(400);
  });
});

describe("GET /pages", () => {
  test("lists pages with their latest title and version", async () => {
    const id = await createPage();
    await send("POST", `/pages/${id}/versions`, { ...fields({ title: "Second" }), base_version: 1 });

    const res = await send("GET", "/pages");
    expect(res.status).toBe(200);
    const pages = (await res.json()) as any[];
    expect(pages.find((p) => p.id === id)).toMatchObject({ url: `${URL_PREFIX}-page`, title: "Second", version: 2 });
    expect(pages.find((p) => p.url === "/how-it-works")).toMatchObject({ title: "How It Works", nav_order: 1 });
  });

  test("is forbidden without the ranking reporter role", async () => {
    mockRankingReporter(false);
    expect((await send("GET", "/pages")).status).toBe(403);
  });
});

describe("DELETE /pages/{id}", () => {
  test("deletes the page and all its versions", async () => {
    const id = await createPage();
    await send("POST", `/pages/${id}/versions`, { ...fields(), base_version: 1 });

    expect((await send("DELETE", `/pages/${id}`)).status).toBe(200);
    expect((await send("GET", `/pages/${id}`)).status).toBe(404);
    const versions = await dbClient.selectFrom("page_version").select("id").where("page_id", "=", id).execute();
    expect(versions).toHaveLength(0);
  });

  test("404s for a missing page", async () => {
    expect((await send("DELETE", "/pages/999999")).status).toBe(404);
  });
});
