import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Lazily-built client for the assets bucket (served at assets.malifaux.uk via
 * CloudFront, which forwards the full path, so S3 key `media/x.png` is served
 * at `/media/x.png`). Lazy so modules that import this don't need the env at
 * load time — check-env.ts still enforces it at deploy.
 */
let client: { s3: S3Client; bucket: string } | undefined;

function getAssets() {
  if (client) return client;
  const accessKeyId = process.env.ASSETS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.ASSETS_SECRET_ACCESS_KEY;
  const bucket = process.env.ASSETS_BUCKET_NAME;
  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("ASSETS_ACCESS_KEY_ID / ASSETS_SECRET_ACCESS_KEY / ASSETS_BUCKET_NAME must be set");
  }
  client = {
    s3: new S3Client({ region: "eu-west-2", credentials: { accessKeyId, secretAccessKey } }),
    bucket,
  };
  return client;
}

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function putAsset(key: string, body: Buffer, contentType: string): Promise<void> {
  const { s3, bucket } = getAssets();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

/** Returns the object's bytes, or null if it doesn't exist. */
export async function getAsset(key: string): Promise<Buffer | null> {
  const { s3, bucket } = getAssets();
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    return Buffer.from(await res.Body.transformToByteArray());
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}
