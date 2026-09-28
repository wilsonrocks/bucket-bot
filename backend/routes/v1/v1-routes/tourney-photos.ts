import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import type { AppEnv } from "../../../hono-env";
import { isRankingReporter } from "../permissions";

const ErrorSchema = z.object({ error: z.string() });

const TourneyPhotoSchema = z.object({
  id: z.number(),
  imageKey: z.string(),
  caption: z.string().nullable(),
  sortOrder: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

const TourneyParamsSchema = z.object({ id: z.string() });
const PhotoParamsSchema = z.object({ id: z.string(), photoId: z.string() });

function listPhotos(db: Kysely<DB>, tourneyId: number) {
  return db
    .selectFrom("tourney_photo")
    .leftJoin("image", "image.key", "tourney_photo.image_key")
    .select([
      "tourney_photo.id",
      "tourney_photo.image_key as imageKey",
      "tourney_photo.caption",
      "tourney_photo.sort_order as sortOrder",
      "image.width",
      "image.height",
    ])
    .where("tourney_photo.tourney_id", "=", tourneyId)
    .orderBy("tourney_photo.sort_order")
    .orderBy("tourney_photo.id")
    .execute();
}

async function tourneyExists(db: Kysely<DB>, tourneyId: number) {
  const row = await db
    .selectFrom("tourney")
    .select("id")
    .where("id", "=", tourneyId)
    .executeTakeFirst();
  return row !== undefined;
}

async function isForbidden(c: { get: (key: "jwtPayload") => unknown }) {
  const { id: userId } = c.get("jwtPayload") as { id: string };
  return !(await isRankingReporter(userId));
}

// ── GET /tourney/{id}/photos ───────────────────────────────────────────────

export const getTourneyPhotosRoute = createRoute({
  method: "get",
  path: "/tourney/{id}/photos",
  request: { params: TourneyParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyPhotoSchema) } },
      description: "The tourney's photos in display order",
    },
  },
});

export const getTourneyPhotosHandler: RouteHandler<
  typeof getTourneyPhotosRoute,
  AppEnv
> = async (c) => {
  const id = Number(c.req.valid("param").id);
  return c.json(await listPhotos(c.get("db"), id), 200);
};

// ── POST /tourney/{id}/photos ──────────────────────────────────────────────

export const addTourneyPhotosRoute = createRoute({
  method: "post",
  path: "/tourney/{id}/photos",
  request: {
    params: TourneyParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            photos: z
              .array(
                z.object({
                  imageKey: z.string().min(1),
                  caption: z.string().nullable().optional(),
                }),
              )
              .min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyPhotoSchema) } },
      description: "The tourney's photos in display order",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

/** Appends the photos after any existing ones, keeping their given order. */
export const addTourneyPhotosHandler: RouteHandler<
  typeof addTourneyPhotosRoute,
  AppEnv
> = async (c) => {
  if (await isForbidden(c)) return c.json({ error: "Forbidden" }, 403);

  const id = Number(c.req.valid("param").id);
  const { photos } = c.req.valid("json");
  const db = c.get("db");

  if (!(await tourneyExists(db, id))) {
    return c.json({ error: "Tourney not found" }, 404);
  }

  await db.transaction().execute(async (trx) => {
    const { maxOrder } = await trx
      .selectFrom("tourney_photo")
      .select((eb) => eb.fn.max("sort_order").as("maxOrder"))
      .where("tourney_id", "=", id)
      .executeTakeFirstOrThrow();
    const start = (maxOrder ?? -1) + 1;

    await trx
      .insertInto("tourney_photo")
      .values(
        photos.map((photo, i) => ({
          tourney_id: id,
          image_key: photo.imageKey,
          caption: photo.caption?.trim() || null,
          sort_order: start + i,
        })),
      )
      .execute();
  });

  return c.json(await listPhotos(db, id), 200);
};

// ── PATCH /tourney/{id}/photos/{photoId} ───────────────────────────────────

export const updateTourneyPhotoRoute = createRoute({
  method: "patch",
  path: "/tourney/{id}/photos/{photoId}",
  request: {
    params: PhotoParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: z.object({ caption: z.string().nullable() }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyPhotoSchema) } },
      description: "The tourney's photos in display order",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

export const updateTourneyPhotoHandler: RouteHandler<
  typeof updateTourneyPhotoRoute,
  AppEnv
> = async (c) => {
  if (await isForbidden(c)) return c.json({ error: "Forbidden" }, 403);

  const params = c.req.valid("param");
  const id = Number(params.id);
  const photoId = Number(params.photoId);
  const { caption } = c.req.valid("json");
  const db = c.get("db");

  const result = await db
    .updateTable("tourney_photo")
    .set({ caption: caption?.trim() || null })
    .where("id", "=", photoId)
    .where("tourney_id", "=", id)
    .executeTakeFirst();

  if (result.numUpdatedRows === 0n) {
    return c.json({ error: "Photo not found" }, 404);
  }
  return c.json(await listPhotos(db, id), 200);
};

// ── DELETE /tourney/{id}/photos/{photoId} ──────────────────────────────────

export const deleteTourneyPhotoRoute = createRoute({
  method: "delete",
  path: "/tourney/{id}/photos/{photoId}",
  request: { params: PhotoParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyPhotoSchema) } },
      description: "The tourney's photos in display order",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

/** Removes the photo from the tourney. The S3 objects are left in place. */
export const deleteTourneyPhotoHandler: RouteHandler<
  typeof deleteTourneyPhotoRoute,
  AppEnv
> = async (c) => {
  if (await isForbidden(c)) return c.json({ error: "Forbidden" }, 403);

  const params = c.req.valid("param");
  const id = Number(params.id);
  const photoId = Number(params.photoId);
  const db = c.get("db");

  const result = await db
    .deleteFrom("tourney_photo")
    .where("id", "=", photoId)
    .where("tourney_id", "=", id)
    .executeTakeFirst();

  if (result.numDeletedRows === 0n) {
    return c.json({ error: "Photo not found" }, 404);
  }
  return c.json(await listPhotos(db, id), 200);
};

// ── PUT /tourney/{id}/photos/order ─────────────────────────────────────────

export const reorderTourneyPhotosRoute = createRoute({
  method: "put",
  path: "/tourney/{id}/photos/order",
  request: {
    params: TourneyParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: z.object({ photoIds: z.array(z.number().int()) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyPhotoSchema) } },
      description: "The tourney's photos in display order",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "photoIds must list exactly the tourney's photos",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

/** Sets the display order to match `photoIds`, which must list every photo exactly once. */
export const reorderTourneyPhotosHandler: RouteHandler<
  typeof reorderTourneyPhotosRoute,
  AppEnv
> = async (c) => {
  if (await isForbidden(c)) return c.json({ error: "Forbidden" }, 403);

  const id = Number(c.req.valid("param").id);
  const { photoIds } = c.req.valid("json");
  const db = c.get("db");

  const ok = await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("tourney_photo")
      .select("id")
      .where("tourney_id", "=", id)
      .execute();
    const existingIds = new Set(existing.map((row) => row.id));
    const requestedIds = new Set(photoIds);
    if (
      requestedIds.size !== photoIds.length ||
      requestedIds.size !== existingIds.size ||
      photoIds.some((photoId) => !existingIds.has(photoId))
    ) {
      return false;
    }

    for (const [index, photoId] of photoIds.entries()) {
      await trx
        .updateTable("tourney_photo")
        .set({ sort_order: index })
        .where("id", "=", photoId)
        .execute();
    }
    return true;
  });

  if (!ok) {
    return c.json(
      { error: "photoIds must list each of the tourney's photos exactly once" },
      400,
    );
  }
  return c.json(await listPhotos(db, id), 200);
};
