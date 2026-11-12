import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { IMAGE_WIDTHS, MAX_SOURCE_DIMENSION, OGP_HEIGHT, OGP_WIDTH, processUpload } from "../images";

/** A solid-colour JPEG stored as `width`×`height` pixels with the given EXIF orientation. */
function jpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  }).jpeg();
  return (orientation ? img.withMetadata({ orientation }) : img).toBuffer();
}

describe("processUpload", () => {
  test("reports dimensions and builds every variant for a plain image", async () => {
    const result = await processUpload(await jpeg(1600, 900));

    expect(result).toMatchObject({ width: 1600, height: 900 });
    expect(result.webps).toHaveLength(IMAGE_WIDTHS.length);
    for (const [i, webp] of result.webps.entries()) {
      const meta = await sharp(webp).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(IMAGE_WIDTHS[i]);
    }

    const ogp = await sharp(result.ogpJpeg).metadata();
    expect(ogp).toMatchObject({ format: "jpeg", width: OGP_WIDTH, height: OGP_HEIGHT });
  });

  test("applies EXIF orientation: a sideways-stored phone portrait comes out upright", async () => {
    // Orientation 6 = rotate 90° to display, so stored landscape is really portrait.
    const result = await processUpload(await jpeg(1600, 900, 6));

    expect(result).toMatchObject({ width: 900, height: 1600 });
    const largest = await sharp(result.webps.at(-1)!).metadata();
    expect(largest.width).toBe(1200);
    expect(largest.height).toBeGreaterThan(largest.width!);
  });

  test("keeps the original's full dimensions even when decoding above the cap", async () => {
    const result = await processUpload(await jpeg(MAX_SOURCE_DIMENSION * 2, 1000));

    expect(result).toMatchObject({ width: MAX_SOURCE_DIMENSION * 2, height: 1000 });
    const largest = await sharp(result.webps.at(-1)!).metadata();
    expect(largest.width).toBe(1200);
    expect(largest.height).toBe(150);
  });

  test("handles PNGs with transparency", async () => {
    const png = await sharp({
      create: { width: 500, height: 500, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const result = await processUpload(png);

    expect(result).toMatchObject({ width: 500, height: 500 });
    const meta = await sharp(result.webps[0]).metadata();
    expect(meta.hasAlpha).toBe(true);
  });
});
