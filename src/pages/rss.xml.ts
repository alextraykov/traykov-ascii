import type { APIRoute } from "astro";
import { getNotes, noteUrl } from "../lib/substack";

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const notes = (await getNotes()).filter((note) => note.source !== "local");
  const items = notes
    .map(
      (note) => `<item>
  <title>${xml(note.title)}</title>
  <link>${xml(noteUrl(note))}</link>
  <guid isPermaLink="true">${xml(noteUrl(note))}</guid>
  <pubDate>${new Date(note.publishedAt).toUTCString()}</pubDate>
  <description>${xml(note.summary)}</description>
</item>`
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Alexander Traykov — Notes</title>
  <link>https://traykov.cc/notes/</link>
  <description>Notes on product design, AI, teams, and visual craft.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};
