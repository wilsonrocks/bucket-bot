import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { dbClient } from "../db-client";

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

// Keep in sync with IMAGE_WIDTHS in routes/v1/v1-routes/upload.ts.
const IMAGE_WIDTHS = [150, 400, 800, 1200] as const;

async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: ASSETS_BUCKET_NAME, Key: key }));
    return true;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "NotFound") {
      return false;
    }
    throw err;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

async function distinctImageKeys(): Promise<string[]> {
  const [teams, paintings] = await Promise.all([
    dbClient
      .selectFrom("team")
      .select("image_key")
      .where("image_key", "is not", null)
      .distinct()
      .execute(),
    dbClient
      .selectFrom("painting_winner")
      .select("image_key")
      .where("image_key", "is not", null)
      .distinct()
      .execute(),
  ]);
  const keys = new Set<string>();
  for (const r of [...teams, ...paintings]) if (r.image_key) keys.add(r.image_key);
  return [...keys];
}

async function main() {
  const keys = await distinctImageKeys();
  console.log(`Found ${keys.length} distinct image keys`);

  let dims = 0;
  let variants = 0;
  let missing = 0;

  for (const key of keys) {
    const originalKey = `media/${key}-original.png`;
    if (!(await exists(originalKey))) {
      missing++;
      console.warn(`  ! missing original for ${key}`);
      continue;
    }

    const obj = await s3.send(
      new GetObjectCommand({ Bucket: ASSETS_BUCKET_NAME, Key: originalKey })
    );
    const buffer = await streamToBuffer(obj.Body as NodeJS.ReadableStream);
    const meta = await sharp(buffer).metadata();

    if (meta.width && meta.height) {
      // Existing originals were all stored as PNG by the previous upload handler.
      await dbClient
        .insertInto("image")
        .values({ key, width: meta.width, height: meta.height, original_ext: "png" })
        .onConflict((oc) =>
          oc.column("key").doUpdateSet({ width: meta.width!, height: meta.height!, original_ext: "png" })
        )
        .execute();
      dims++;
    }

    // Generate any WebP width variants that don't exist yet. Old -w*.png files
    // are left in place.
    for (const w of IMAGE_WIDTHS) {
      const variantKey = `media/${key}-w${w}.webp`;
      if (await exists(variantKey)) continue;
      const webp = await sharp(buffer).resize({ width: w }).webp({ quality: 80 }).toBuffer();
      await s3.send(
        new PutObjectCommand({
          Bucket: ASSETS_BUCKET_NAME,
          Key: variantKey,
          Body: webp,
          ContentType: "image/webp",
        })
      );
      variants++;
      console.log(`  + ${variantKey}`);
    }
  }

  console.log(`Done. Recorded dims for ${dims}, created ${variants} variants, ${missing} missing originals.`);
  await dbClient.destroy();
}

main().catch(async (err) => {
  console.error(err);
  await dbClient.destroy();
  process.exit(1);
});
