import type { Thing, WithContext } from "schema-dts";

export const SITE_URL = "https://malifaux.uk";
export const SITE_NAME = "UK Malifaux Community";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/bucket-bot-logo-original.png`;
const DEFAULT_DESCRIPTION =
  "Rankings, results and best-painted winners from the UK Malifaux tournament scene.";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkTag = { rel: string; href: string };

type ScriptTag = { type: string; children: string };

export interface SeoInput {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  /**
   * "wide" images are pre-cropped to 1200x630; "square" ones (e.g. Discord
   * avatars) get a small-thumbnail card instead so unfurls don't stretch them.
   */
  imageShape?: "wide" | "square";
  type?: "website" | "article" | "profile";
}

export interface SeoOutput {
  meta: MetaTag[];
  links: LinkTag[];
}

export function seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  imageShape = "wide",
  type = "website",
}: SeoInput): SeoOutput {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const ogImageType = imageMimeType(ogImage);
  const isWide = !!image && imageShape === "wide";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage },
      { property: "og:image:secure_url", content: ogImage },
      { property: "og:image:type", content: ogImageType },
      ...(isWide
        ? [
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
      {
        name: "twitter:card",
        content: image && !isWide ? "summary" : "summary_large_image",
      },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

function imageMimeType(url: string): string {
  const path = url.split("?")[0]!;
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function jsonLd<T extends Thing>(data: WithContext<T>): ScriptTag {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data),
  };
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
