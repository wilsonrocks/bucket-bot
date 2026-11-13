import sharp from "sharp";

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

// Responsive width ladder. Keep in sync with ASSET_WIDTHS in site/src/components/image.tsx.
export const IMAGE_WIDTHS = [35, 150, 400, 800, 1200] as const;

/**
 * Longest edge we decode an upload at. Every variant is at most 1200px wide, so
 * nothing needs more, and decoded size goes with pixel count — a 48 MP phone photo
 * is ~190 MB raw. For JPEGs sharp shrinks on load, so the full-size bitmap is never
 * built at all. The admin client caps uploads at the same size.
 */
export const MAX_SOURCE_DIMENSION = 4000;

export type ProcessedImage = {
  /** The original's intrinsic size, upright (EXIF orientation applied). */
  width: number;
  height: number;
  /** One WebP per IMAGE_WIDTHS entry, in the same order. */
  webps: Buffer[];
  ogpJpeg: Buffer;
};

/**
 * Build every served variant of an upload from a single decode. The image is
 * decoded once — upright and capped at MAX_SOURCE_DIMENSION — into a raw bitmap,
 * and the variants are made from that one after another, so an upload holds one
 * decoded copy at a time rather than one per variant.
 */
export async function processUpload(buffer: Buffer): Promise<ProcessedImage> {
  // Header only — cheap, and reports the upright size of the full original.
  const meta = await sharp(buffer).metadata();

  const { data, info } = await sharp(buffer)
    .autoOrient()
    .resize({
      width: MAX_SOURCE_DIMENSION,
      height: MAX_SOURCE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };

  const webps: Buffer[] = [];
  for (const w of IMAGE_WIDTHS) {
    webps.push(await sharp(data, raw).resize({ width: w }).webp({ quality: 80 }).toBuffer());
  }
  const ogpJpeg = await makeOgpJpeg(data, raw);

  return {
    width: meta.autoOrient.width,
    height: meta.autoOrient.height,
    webps,
    ogpJpeg,
  };
}

/**
 * The 1200×630 social card: the image fitted inside, over a blurred, darkened
 * cover-crop of itself. Pass `options` for raw input (see processUpload).
 */
export async function makeOgpJpeg(input: Buffer, options?: sharp.SharpOptions): Promise<Buffer> {
  // autoOrient is a no-op for raw input, but keeps encoded originals (e.g. from
  // the backfill script) upright.
  const source = () => sharp(input, options).autoOrient();

  const bg = await source()
    .resize({ width: OGP_WIDTH, height: OGP_HEIGHT, fit: "cover" })
    .blur(40)
    .modulate({ brightness: 0.6 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const fg = await source()
    .resize({ width: OGP_WIDTH, height: OGP_HEIGHT, fit: "inside" })
    .png()
    .toBuffer();

  return sharp(bg.data, {
    raw: { width: bg.info.width, height: bg.info.height, channels: bg.info.channels },
  })
    .composite([{ input: fg, gravity: "center" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
