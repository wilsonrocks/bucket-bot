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
  addTourneyPhotosHandler,
  addTourneyPhotosRoute,
  deleteTourneyPhotoHandler,
  deleteTourneyPhotoRoute,
  getTourneyPhotosHandler,
  getTourneyPhotosRoute,
  reorderTourneyPhotosHandler,
  reorderTourneyPhotosRoute,
  updateTourneyPhotoHandler,
  updateTourneyPhotoRoute,
} from "./tourney-photos";

function mockRankingReporter(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: {
              cache: { has: (id: string) => hasRole && id === "reporter-role-id" },
            },
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
    c.set("jwtPayload", { id: "test-user" } as any);
    await next();
  });
  app.openapi(getTourneyPhotosRoute, getTourneyPhotosHandler);
  app.openapi(addTourneyPhotosRoute, addTourneyPhotosHandler);
  app.openapi(reorderTourneyPhotosRoute, reorderTourneyPhotosHandler);
  app.openapi(updateTourneyPhotoRoute, updateTourneyPhotoHandler);
  app.openapi(deleteTourneyPhotoRoute, deleteTourneyPhotoHandler);
  return app;
}

function send(method: string, path: string, body?: object) {
  return makeApp().request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
}

async function list(tourneyId: number) {
  const res = await makeApp().request(`/tourney/${tourneyId}/photos`);
  expect(res.status).toBe(200);
  return (await res.json()) as any[];
}

const TOURNEY_NAME = "test-tourney-photos-route";
let tourneyId: number;
let otherTourneyId: number;

async function createTourney(suffix: string) {
  const { id } = await dbClient
    .insertInto("tourney")
    .values({ name: `${TOURNEY_NAME}-${suffix}`, date: "2026-01-01", number_of_players: 8 })
    .returning("id")
    .executeTakeFirstOrThrow();
  return id;
}

async function addPhotos(id: number, ...keys: string[]) {
  const res = await send("POST", `/tourney/${id}/photos`, {
    photos: keys.map((imageKey) => ({ imageKey })),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as any[];
}

beforeEach(async () => {
  mockRankingReporter(true);
  tourneyId = await createTourney("a");
  otherTourneyId = await createTourney("b");
});

afterEach(async () => {
  await dbClient.deleteFrom("tourney").where("name", "like", `${TOURNEY_NAME}-%`).execute();
});

describe("tourney photos", () => {
  test("appends photos after existing ones and lists them in order", async () => {
    await addPhotos(tourneyId, "event/a", "event/b");
    const photos = await addPhotos(tourneyId, "event/c");

    expect(photos.map((p) => p.imageKey)).toEqual(["event/a", "event/b", "event/c"]);
    expect((await list(tourneyId)).map((p) => p.imageKey)).toEqual([
      "event/a",
      "event/b",
      "event/c",
    ]);
    expect(await list(otherTourneyId)).toEqual([]);
  });

  test("stores trimmed captions, with blank captions as null", async () => {
    const res = await send("POST", `/tourney/${tourneyId}/photos`, {
      photos: [
        { imageKey: "event/a", caption: "  Top table  " },
        { imageKey: "event/b", caption: "   " },
      ],
    });
    const photos = (await res.json()) as any[];
    expect(photos.map((p) => p.caption)).toEqual(["Top table", null]);
  });

  test("returns 404 when adding photos to a missing tourney", async () => {
    const res = await send("POST", `/tourney/999999999/photos`, {
      photos: [{ imageKey: "event/a" }],
    });
    expect(res.status).toBe(404);
  });

  test("updates a caption", async () => {
    const [photo] = await addPhotos(tourneyId, "event/a");
    const res = await send("PATCH", `/tourney/${tourneyId}/photos/${photo.id}`, {
      caption: "Winners",
    });
    expect(res.status).toBe(200);
    expect((await list(tourneyId))[0].caption).toBe("Winners");
  });

  test("won't update or delete a photo through another tourney", async () => {
    const [photo] = await addPhotos(tourneyId, "event/a");
    const patch = await send("PATCH", `/tourney/${otherTourneyId}/photos/${photo.id}`, {
      caption: "nope",
    });
    const del = await send("DELETE", `/tourney/${otherTourneyId}/photos/${photo.id}`);
    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
    expect(await list(tourneyId)).toHaveLength(1);
  });

  test("deletes a photo", async () => {
    const [a, b] = await addPhotos(tourneyId, "event/a", "event/b");
    const res = await send("DELETE", `/tourney/${tourneyId}/photos/${a.id}`);
    expect(res.status).toBe(200);
    expect((await list(tourneyId)).map((p) => p.id)).toEqual([b.id]);
  });

  test("reorders photos", async () => {
    const [a, b, c] = await addPhotos(tourneyId, "event/a", "event/b", "event/c");
    const res = await send("PUT", `/tourney/${tourneyId}/photos/order`, {
      photoIds: [c.id, a.id, b.id],
    });
    expect(res.status).toBe(200);
    expect((await list(tourneyId)).map((p) => p.id)).toEqual([c.id, a.id, b.id]);
  });

  test("rejects a reorder that doesn't list exactly the tourney's photos", async () => {
    const [a, b] = await addPhotos(tourneyId, "event/a", "event/b");
    const [other] = await addPhotos(otherTourneyId, "event/x");

    for (const photoIds of [[a.id], [a.id, a.id], [a.id, other.id], [a.id, b.id, other.id]]) {
      const res = await send("PUT", `/tourney/${tourneyId}/photos/order`, { photoIds });
      expect(res.status).toBe(400);
    }
    expect((await list(tourneyId)).map((p) => p.id)).toEqual([a.id, b.id]);
  });

  test("forbids changes from users without the ranking reporter role", async () => {
    const [photo] = await addPhotos(tourneyId, "event/a");
    mockRankingReporter(false);

    const responses = await Promise.all([
      send("POST", `/tourney/${tourneyId}/photos`, { photos: [{ imageKey: "event/b" }] }),
      send("PATCH", `/tourney/${tourneyId}/photos/${photo.id}`, { caption: "x" }),
      send("DELETE", `/tourney/${tourneyId}/photos/${photo.id}`),
      send("PUT", `/tourney/${tourneyId}/photos/order`, { photoIds: [photo.id] }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);

    // Listing stays public.
    expect(await list(tourneyId)).toHaveLength(1);
  });

  test("deleting the tourney deletes its photos", async () => {
    await addPhotos(tourneyId, "event/a");
    await dbClient.deleteFrom("tourney").where("id", "=", tourneyId).execute();
    const remaining = await dbClient
      .selectFrom("tourney_photo")
      .select("id")
      .where("tourney_id", "=", tourneyId)
      .execute();
    expect(remaining).toEqual([]);
  });
});
