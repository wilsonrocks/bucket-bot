import { readFileSync } from "fs";
import type { ReactNode } from "react";
import satori from "satori";
import sharp from "sharp";

type SatoriFont = Parameters<typeof satori>[1]["fonts"][number];

let fonts: SatoriFont[] | undefined;

function loadFonts(): SatoriFont[] {
  if (fonts) return fonts;
  const file = (pkg: string, name: string) =>
    readFileSync(require.resolve(`@fontsource/${pkg}/files/${name}`));
  fonts = [
    { name: "Inter", data: file("inter", "inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Inter", data: file("inter", "inter-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: "Inter", data: file("inter", "inter-latin-900-normal.woff"), weight: 900, style: "normal" },
    { name: "Cinzel", data: file("cinzel", "cinzel-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: "Cinzel", data: file("cinzel", "cinzel-latin-900-normal.woff"), weight: 900, style: "normal" },
  ];
  return fonts;
}

/** Renders a satori element tree to a PNG of exactly width × height. */
export async function renderPng(element: ReactNode, width: number, height: number): Promise<Buffer> {
  const svg = await satori(element, { width, height, fonts: loadFonts() });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/** Turns any image buffer into a PNG data URI satori can embed, resized to fit `size`. */
export async function toDataUri(buffer: Buffer, size: number): Promise<string> {
  const png = await sharp(buffer)
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
