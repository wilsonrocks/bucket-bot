import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { makeOgpPng } from "../logic/images";

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

const PREFIXES = ["media/team/", "media/painting/"];

async function listAllOriginals(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: ASSETS_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Key.endsWith("-original.png")) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

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

async function main() {
  let created = 0;
  let skipped = 0;

  for (const prefix of PREFIXES) {
    const originals = await listAllOriginals(prefix);
    console.log(`[${prefix}] found ${originals.length} originals`);
    for (const originalKey of originals) {
      const baseKey = originalKey.slice(0, -"-original.png".length);
      const ogpKey = `${baseKey}-ogp.png`;

      if (await exists(ogpKey)) {
        skipped++;
        continue;
      }

      const obj = await s3.send(
        new GetObjectCommand({ Bucket: ASSETS_BUCKET_NAME, Key: originalKey })
      );
      const buffer = await streamToBuffer(obj.Body as NodeJS.ReadableStream);
      const ogp = await makeOgpPng(buffer);

      await s3.send(
        new PutObjectCommand({
          Bucket: ASSETS_BUCKET_NAME,
          Key: ogpKey,
          Body: ogp,
          ContentType: "image/png",
        })
      );

      created++;
      console.log(`  + ${ogpKey}`);
    }
  }

  console.log(`Done. Created ${created}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
