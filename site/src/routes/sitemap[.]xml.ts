import { createFileRoute } from "@tanstack/react-router";
import { SitemapStream, streamToPromise } from "sitemap";
import { db } from "#/db-client";
import { SITE_URL } from "#/helpers/seo";

type Freq = "weekly" | "monthly" | "yearly";
type Entry = {
  url: string;
  priority: number;
  changefreq: Freq;
  lastmod?: string;
};

const STATIC_ENTRIES: Entry[] = [
  { url: "/best-painted", priority: 1.0, changefreq: "weekly" },
  { url: "/", priority: 0.9, changefreq: "weekly" },
  { url: "/rankings", priority: 0.8, changefreq: "weekly" },
  { url: "/team-rankings", priority: 0.8, changefreq: "weekly" },
  { url: "/faction-rankings", priority: 0.8, changefreq: "weekly" },
  { url: "/regions", priority: 0.8, changefreq: "weekly" },
  { url: "/how-it-works", priority: 0.5, changefreq: "yearly" },
  { url: "/events", priority: 0.3, changefreq: "weekly" },
  { url: "/teams", priority: 0.3, changefreq: "weekly" },
  { url: "/players", priority: 0.3, changefreq: "weekly" },
];

const toIso = (d: Date | string | null | undefined): string | undefined => {
  if (!d) return undefined;
  return (d instanceof Date ? d : new Date(d)).toISOString();
};

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [players, teams, tourneys] = await Promise.all([
          db.selectFrom("player").select(["id", "created_at"]).execute(),
          db.selectFrom("team").select(["id", "created_at"]).execute(),
          db.selectFrom("tourney").select(["id", "date"]).execute(),
        ]);

        const dynamicEntries: Entry[] = [
          ...players.map((p): Entry => ({
            url: `/player/${p.id}`,
            priority: 0.6,
            changefreq: "monthly",
            lastmod: toIso(p.created_at),
          })),
          ...teams.map((t): Entry => ({
            url: `/team/${t.id}`,
            priority: 0.6,
            changefreq: "monthly",
            lastmod: toIso(t.created_at),
          })),
          ...tourneys.map((e): Entry => ({
            url: `/event/${e.id}`,
            priority: 0.6,
            changefreq: "monthly",
            lastmod: toIso(e.date),
          })),
        ];

        const stream = new SitemapStream({ hostname: SITE_URL });
        for (const entry of [...STATIC_ENTRIES, ...dynamicEntries]) {
          stream.write(entry);
        }
        stream.end();

        const xml = await streamToPromise(stream);

        return new Response(new Uint8Array(xml), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
