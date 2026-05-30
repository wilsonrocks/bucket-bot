import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import type { AppEnv } from "../../../hono-env.js";
import { makeOgpJpeg } from "../../../logic/images";

// ── S3 singleton ───────────────────────────────────────────────────────────

const ASSETS_ACCESS_KEY_ID = process.env.ASSETS_ACCESS_KEY_ID;
const ASSETS_SECRET_ACCESS_KEY = process.env.ASSETS_SECRET_ACCESS_KEY;
const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME;

if (!ASSETS_ACCESS_KEY_ID) throw new Error("ASSETS_ACCESS_KEY_ID is not defined");
if (!ASSETS_SECRET_ACCESS_KEY) throw new Error("ASSETS_SECRET_ACCESS_KEY is not defined");
if (!ASSETS_BUCKET_NAME) throw new Error("ASSETS_BUCKET_NAME is not defined");

const s3 = new S3Client({
  region: "eu-west-2",
  credentials: {
    accessKeyId: ASSETS_ACCESS_KEY_ID,
    secretAccessKey: ASSETS_SECRET_ACCESS_KEY,
  },
});

// ── Route ──────────────────────────────────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024;
// Responsive width ladder. Keep in sync with ASSET_WIDTHS in site/src/components/image.tsx.
const IMAGE_WIDTHS = [150, 400, 800, 1200] as const;

const ErrorSchema = z.object({ error: z.string() });

export const uploadRoute = createRoute({
  method: "post",
  path: "/upload",
  request: {
    query: z.object({ type: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ key: z.string() }) } },
      description: "Upload successful — returns base key",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
    413: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "File too large",
    },
  },
});

export const uploadHandler: RouteHandler<typeof uploadRoute, AppEnv> = async (c) => {
  // Check Content-Length before reading body
  const contentLength = Number(c.req.header("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return c.json({ error: "File too large (max 10 MB)" }, 413);
  }

  const { type } = c.req.valid("query");

  const ALLOWED_TYPES = ["team", "painting"];
  if (!ALLOWED_TYPES.includes(type)) {
    return c.json({ error: "Invalid upload type" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "Missing or invalid 'file' field" }, 400);
  }

  const EXT_BY_TYPE: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return c.json({ error: "Only PNG, JPEG, and WebP are accepted" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const baseKey = `${type}/${hash}`;

  // Variants are served as WebP (smaller for the same quality); the OGP card stays
  // JPEG for social/crawler compatibility; the original is kept untouched in its
  // uploaded format as the regeneration source-of-truth.
  const [resizedWebps, ogpJpeg, meta] = await Promise.all([
    Promise.all(IMAGE_WIDTHS.map((w) => sharp(buffer).resize({ width: w }).webp({ quality: 80 }).toBuffer())),
    makeOgpJpeg(buffer),
    sharp(buffer).metadata(),
  ]);

  // CloudFront forwards the full path to S3, so /media/team/x.webp → S3 key media/team/x.webp
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-original.${ext}`,
      Body: buffer,
      ContentType: file.type,
    })),
    ...resizedWebps.map((webp, i) => s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-w${IMAGE_WIDTHS[i]}.webp`,
      Body: webp,
      ContentType: "image/webp",
    }))),
    s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-ogp.jpg`,
      Body: ogpJpeg,
      ContentType: "image/jpeg",
    })),
  ]);

  // Record the original's intrinsic dimensions so the site can reserve layout
  // space and build a responsive srcset. Upsert: re-uploading the same file
  // (same hash → same key) refreshes the dimensions.
  if (meta.width && meta.height) {
    await c.get("db")
      .insertInto("image")
      .values({ key: baseKey, width: meta.width, height: meta.height, original_ext: ext })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({ width: meta.width!, height: meta.height!, original_ext: ext })
      )
      .execute();
  }

  return c.json({ key: baseKey }, 200);
};
