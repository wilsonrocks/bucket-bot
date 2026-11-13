import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import type { AppEnv } from "../../../hono-env.js";
import { IMAGE_WIDTHS, processUpload } from "../../../logic/images";

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

const MAX_BYTES = 30 * 1024 * 1024;
// Keys are content-hashed (sha256 of the upload), so a changed image always gets a
// new URL — the variants are safe to cache immutably for the browser/CloudFront.
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const ErrorSchema = z.object({ error: z.string() });

export const uploadRoute = createRoute({
  method: "post",
  path: "/upload",
  request: {
    query: z.object({
      type: z.string(),
      // Only used for logging: the real name is inside the multipart body, which we
      // don't read when rejecting an oversized upload.
      filename: z.string().optional(),
    }),
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

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const uploadHandler: RouteHandler<typeof uploadRoute, AppEnv> = async (c) => {
  const started = Date.now();
  const { type, filename } = c.req.valid("query");
  const userId = (c.get("jwtPayload") as { id?: string } | undefined)?.id ?? "unknown";
  const context = (name = filename) =>
    `type=${type} filename=${JSON.stringify(name ?? "unknown")} user=${userId}`;

  // Check Content-Length before reading body
  const contentLength = Number(c.req.header("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    console.warn(
      `Upload rejected (413): ${formatBytes(contentLength)} is over the ${formatBytes(MAX_BYTES)} limit; ${context()}`
    );
    return c.json({ error: "File too large (max 30 MB)" }, 413);
  }

  const ALLOWED_TYPES = ["team", "painting", "achievement", "event"];
  if (!ALLOWED_TYPES.includes(type)) {
    console.warn(`Upload rejected (400): invalid upload type; ${context()}`);
    return c.json({ error: "Invalid upload type" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    console.warn(`Upload rejected (400): missing 'file' field; ${context()}`);
    return c.json({ error: "Missing or invalid 'file' field" }, 400);
  }

  const EXT_BY_TYPE: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    console.warn(
      `Upload rejected (400): unsupported format ${JSON.stringify(file.type)}, ${formatBytes(file.size)}; ${context(file.name)}`
    );
    return c.json({ error: "Only PNG, JPEG, and WebP are accepted" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const baseKey = `${type}/${hash}`;

  // Variants are served as WebP (smaller for the same quality); the OGP card stays
  // JPEG for social/crawler compatibility; the original is kept untouched in its
  // uploaded format as the regeneration source-of-truth. All of them come from a
  // single decode, built one after another — see processUpload.
  const { width, height, webps: resizedWebps, ogpJpeg } = await processUpload(buffer);

  // CloudFront forwards the full path to S3, so /media/team/x.webp → S3 key media/team/x.webp
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-original.${ext}`,
      Body: buffer,
      ContentType: file.type,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    })),
    ...resizedWebps.map((webp, i) => s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-w${IMAGE_WIDTHS[i]}.webp`,
      Body: webp,
      ContentType: "image/webp",
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }))),
    s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-ogp.jpg`,
      Body: ogpJpeg,
      ContentType: "image/jpeg",
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    })),
  ]);

  // Record the original's intrinsic (upright) dimensions so the site can reserve
  // layout space and build a responsive srcset. Upsert: re-uploading the same file
  // (same hash → same key) refreshes the dimensions.
  await c.get("db")
    .insertInto("image")
    .values({ key: baseKey, width, height, original_ext: ext })
    .onConflict((oc) => oc.column("key").doUpdateSet({ width, height, original_ext: ext }))
    .execute();

  console.log(
    `Upload ok: ${baseKey} ${formatBytes(file.size)} ${width}x${height} in ${Date.now() - started}ms; ${context(file.name)}`
  );
  return c.json({ key: baseKey }, 200);
};
