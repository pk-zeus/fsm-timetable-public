import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://fsm-timetable.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/week", changefreq: "daily", priority: "0.9" },
          { path: "/changes", changefreq: "daily", priority: "0.6" },
          { path: "/more", changefreq: "monthly", priority: "0.5" },
          { path: "/more/about", changefreq: "monthly", priority: "0.4" },
          { path: "/more/clash", changefreq: "weekly", priority: "0.5" },
          { path: "/more/explore", changefreq: "weekly", priority: "0.5" },
          { path: "/more/rooms", changefreq: "weekly", priority: "0.5" },
          { path: "/more/teachers", changefreq: "weekly", priority: "0.5" },
          { path: "/more/share", changefreq: "monthly", priority: "0.4" },
          { path: "/more/settings", changefreq: "monthly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
