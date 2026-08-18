import type { APIRoute } from "astro";
import { getCaseStudies } from "../lib/content";
import { getPublicCaseStudies } from "../lib/public-case-studies";
import { getNotes } from "../lib/substack";

const SITE_URL = "https://traykov.cc";

const staticPaths = [
  "/",
  "/about/",
  "/contact/",
  "/cv/",
  "/notes/",
  "/labs/",
  "/labs/ascii-banner/",
  "/labs/product-systems-kit/",
  "/labs/rhizome-field/",
  "/labs/sketchbook/",
  "/svg-ascii-studio/",
  "/playground/",
  "/shader-explainer/",
  "/roadmap/",
  "/obj-turntable/",
  "/pave-turntable/",
  "/sasi-turntable/",
  "/synapse-turntable/"
];

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sourceDate(value: string): string | undefined {
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
}

export const GET: APIRoute = async () => {
  const entries = new Map<string, string | undefined>();

  for (const path of staticPaths) {
    entries.set(new URL(path, SITE_URL).toString(), undefined);
  }

  for (const study of getPublicCaseStudies(getCaseStudies())) {
    entries.set(new URL(study.href, SITE_URL).toString(), undefined);
  }

  const notes = await getNotes();
  for (const note of notes) {
    if (note.source !== "local-published" && note.source !== "legacy") continue;
    const url = new URL(note.canonicalUrl, SITE_URL);
    if (url.origin !== SITE_URL) continue;
    entries.set(url.toString(), sourceDate(note.publishedAt));
  }

  const urls = Array.from(entries, ([loc, lastmod]) => `  <url>
    <loc>${xml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
