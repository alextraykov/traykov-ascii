import type { APIRoute } from "astro";
import { getNotes } from "../../lib/substack";

export const GET: APIRoute = async () => {
  const notes = await getNotes();

  return new Response(
    JSON.stringify(
      notes.map((note) => ({
        slug: note.slug,
        title: note.title,
        summary: note.summary,
        text: note.plainText,
        tags: note.tags
      }))
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate"
      }
    }
  );
};
