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
  type = "website",
}: SeoInput): SeoOutput {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const ogImageType = ogImage.endsWith(".png") ? "image/png" : "image/jpeg";

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
      ...(image
        ? [
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
  };
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
