import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import type { AppEnv } from "../../../hono-env.js";

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
const IMAGE_WIDTHS = [150, 800] as const;

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

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return c.json({ error: "Only PNG, JPEG, and WebP are accepted" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const baseKey = `${type}/${hash}`;

  const [originalPng, resizedPngs] = await Promise.all([
    sharp(buffer).png().toBuffer(),
    Promise.all(IMAGE_WIDTHS.map((w) => sharp(buffer).resize({ width: w }).png().toBuffer())),
  ]);

  // CloudFront forwards the full path to S3, so /media/team/x.png → S3 key media/team/x.png
  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-original.png`,
      Body: originalPng,
      ContentType: "image/png",
    })),
    ...resizedPngs.map((png, i) => s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET_NAME,
      Key: `media/${baseKey}-w${IMAGE_WIDTHS[i]}.png`,
      Body: png,
      ContentType: "image/png",
    }))),
  ]);

  return c.json({ key: baseKey }, 200);
};
