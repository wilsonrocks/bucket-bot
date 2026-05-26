import sharp from "sharp";

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

export async function makeOgpJpeg(buffer: Buffer): Promise<Buffer> {
  const bg = await sharp(buffer)
    .resize({ width: OGP_WIDTH, height: OGP_HEIGHT, fit: "cover" })
    .blur(40)
    .modulate({ brightness: 0.6 })
    .toBuffer();

  const fg = await sharp(buffer)
    .resize({ width: OGP_WIDTH, height: OGP_HEIGHT, fit: "inside" })
    .toBuffer();

  return sharp(bg)
    .composite([{ input: fg, gravity: "center" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
