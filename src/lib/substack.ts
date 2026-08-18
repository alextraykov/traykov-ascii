import digitalArtDraft from "../content/notes/on-digital-art.json";
import designOutsideDesignDraft from "../content/notes/design-outside-design.json";
import localDraft from "../content/notes/prompting-is-not-taste.json";
import confidenceDraft from "../content/notes/the-confidence-crutch.json";
import cemeteryLoopDraft from "../content/notes/the-cemetery-loop.json";
import aiProductDesignerOwnershipDraft from "../content/notes/what-an-ai-product-designer-owns-in-an-enterprise-product.json";
import titlesDraft from "../content/notes/whats-the-actual-point-of-titles.json";
import legacyManifest from "../content/notes/legacy/index.json";

const legacyBodies = import.meta.glob("../content/notes/legacy/*.html", {
  eager: true,
  query: "?raw",
  import: "default"
}) as Record<string, string>;

const PUBLICATION_URL = "https://alexandertraykov.substack.com";
const FEED_URL = `${PUBLICATION_URL}/feed`;
const SITE_URL = "https://traykov.cc";

export type NoteRecord = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  sourceUrl?: string;
  canonicalUrl: string;
  contentHtml: string;
  plainText: string;
  heroImage?: string;
  heroImageAlt?: string;
  visual?: "web-cemetery";
  tags: string[];
  readTime: string;
  source: "substack" | "legacy" | "local" | "local-published";
};

type LocalNoteDraft = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  image?: string;
  imageAlt?: string;
  visual?: "web-cemetery";
  status?: "published";
  tags: string[];
  paragraphs?: string[];
  blocks?: Array<
    | { type: "paragraph"; text: string }
    | { type: "list" | "questions"; items: string[] }
  >;
};

const localDrafts: LocalNoteDraft[] = [
  digitalArtDraft,
  designOutsideDesignDraft,
  confidenceDraft,
  cemeteryLoopDraft,
  localDraft,
  aiProductDesignerOwnershipDraft,
  titlesDraft
];

function decodeXmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return named[entity.toLowerCase()] ?? match;
  });
}

function unwrapXmlValue(value: string): string {
  const trimmed = value.trim();
  const cdata = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : decodeXmlEntities(trimmed);
}

function xmlElement(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}>`, "i")
  );
  return match ? unwrapXmlValue(match[1]) : "";
}

function xmlElements(source: string, name: string): string[] {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(
    source.matchAll(
      new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}>`, "gi")
    ),
    (match) => unwrapXmlValue(match[1])
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function localInlineHtml(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function localDraftContent(draft: LocalNoteDraft): { contentHtml: string; plainText: string } {
  if (draft.blocks) {
    const contentHtml = draft.blocks
      .map((block) => {
        if (block.type === "paragraph") {
          return `<p>${localInlineHtml(block.text)}</p>`;
        }

        if (block.type === "list") {
          return `<ul>${block.items.map((item) => `<li>${localInlineHtml(item)}</li>`).join("")}</ul>`;
        }

        return `<div class="note-question-list">${block.items
          .map((item) => `<p>${localInlineHtml(item)}</p>`)
          .join("")}</div>`;
      })
      .join("\n");
    const plainText = draft.blocks
      .flatMap((block) => block.type === "paragraph" ? [block.text] : block.items)
      .join(" ")
      .replace(/\*\*/g, "");

    return { contentHtml, plainText };
  }

  const paragraphs = draft.paragraphs ?? [];
  return {
    contentHtml: paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("\n"),
    plainText: paragraphs.join(" ")
  };
}

function stripHtml(value: string): string {
  return decodeXmlEntities(
    value
      .replace(/<(br|hr)\b[^>]*>/gi, " ")
      .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function summaryFrom(value: string, fallback = ""): string {
  const text = stripHtml(value) || fallback;
  if (text.length <= 190) return text;
  return `${text.slice(0, 187).replace(/\s+\S*$/, "")}…`;
}

function noteSlug(sourceUrl: string, title: string): string {
  try {
    const parts = new URL(sourceUrl).pathname.split("/").filter(Boolean);
    const postIndex = parts.indexOf("p");
    if (postIndex >= 0 && parts[postIndex + 1]) return parts[postIndex + 1];
  } catch {
    // Fall through to a title-derived slug.
  }

  return (
    title
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "note"
  );
}

function normalizeSubstackHtml(value: string): string {
  return value
    .replace(/<(script|style|noscript|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<h1(\s[^>]*)?>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(
      /\b(href|src)=(["'])\/(?!\/)/gi,
      (_match, attribute: string, quote: string) =>
        `${attribute}=${quote}${PUBLICATION_URL}/`
    )
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"');
}

function firstImage(value: string): string | undefined {
  const match = value.match(/<img\b[^>]*\bsrc=(["'])(.*?)\1/i);
  return match?.[2];
}

function readTime(value: string): string {
  const words = value.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

function parseFeed(xml: string): NoteRecord[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => match[1]);

  return items
    .map((item): NoteRecord | null => {
      const title = xmlElement(item, "title");
      const sourceUrl = xmlElement(item, "link") || xmlElement(item, "guid");
      const publishedAt = xmlElement(item, "pubDate");
      const rawContent = xmlElement(item, "content:encoded");
      const contentHtml = normalizeSubstackHtml(rawContent);
      const plainText = stripHtml(contentHtml);

      if (!title || !sourceUrl || !contentHtml) return null;

      const slug = noteSlug(sourceUrl, title);
      const description = xmlElement(item, "description");

      return {
        slug,
        title: decodeXmlEntities(title),
        summary: summaryFrom(description, summaryFrom(contentHtml)),
        publishedAt: new Date(publishedAt || Date.now()).toISOString(),
        sourceUrl,
        canonicalUrl: sourceUrl,
        contentHtml,
        plainText,
        heroImage: firstImage(contentHtml),
        tags: xmlElements(item, "category").map(decodeXmlEntities),
        readTime: readTime(plainText),
        source: "substack"
      };
    })
    .filter((note): note is NoteRecord => Boolean(note));
}

function localNotes(): NoteRecord[] {
  return localDrafts.map((draft) => {
    const { contentHtml, plainText } = localDraftContent(draft);

    return {
      slug: draft.slug,
      title: draft.title,
      summary: draft.summary,
      publishedAt: draft.publishedAt,
      canonicalUrl: `${SITE_URL}/notes/${draft.slug}/`,
      contentHtml,
      plainText,
      heroImage: draft.image,
      heroImageAlt: draft.imageAlt,
      visual: draft.visual,
      tags: draft.tags,
      readTime: readTime(plainText),
      source: draft.status === "published" ? "local-published" as const : "local" as const
    };
  });
}

function legacyNotes(): NoteRecord[] {
  return legacyManifest.map((entry) => {
    const bodyKey = Object.keys(legacyBodies).find((key) => key.endsWith(`/${entry.bodyFile}`));
    const contentHtml = bodyKey ? legacyBodies[bodyKey] : "";
    const plainText = stripHtml(contentHtml);

    return {
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      publishedAt: entry.publishedAt,
      sourceUrl: entry.sourceUrl,
      canonicalUrl: `${SITE_URL}/notes/${entry.slug}/`,
      contentHtml,
      plainText,
      heroImage: entry.heroImage ?? undefined,
      tags: entry.tags,
      readTime: readTime(plainText),
      source: "legacy"
    };
  }).filter((note) => note.contentHtml);
}

function comparableTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadNotes(): Promise<NoteRecord[]> {
  let feedNotes: NoteRecord[] = [];

  try {
    const response = await fetch(FEED_URL, {
      headers: {
        accept: "application/rss+xml, application/xml;q=0.9",
        "user-agent": "traykov.cc notes build"
      }
    });

    if (!response.ok) throw new Error(`Substack feed returned ${response.status}`);
    feedNotes = parseFeed(await response.text());
  } catch (error) {
    console.warn("[notes] Substack feed unavailable; building local previews only.", error);
  }

  const bySlug = new Map(feedNotes.map((note) => [note.slug, note]));
  const importedTitles = new Set(feedNotes.map((note) => comparableTitle(note.title)));

  for (const note of legacyNotes()) {
    if (bySlug.has(note.slug) || importedTitles.has(comparableTitle(note.title))) continue;
    bySlug.set(note.slug, note);
    importedTitles.add(comparableTitle(note.title));
  }

  for (const note of localNotes()) {
    if (!bySlug.has(note.slug)) bySlug.set(note.slug, note);
  }

  return Array.from(bySlug.values()).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );
}

let notePromise: Promise<NoteRecord[]> | undefined;

export function getNotes(): Promise<NoteRecord[]> {
  notePromise ??= loadNotes();
  return notePromise;
}

export function noteUrl(note: Pick<NoteRecord, "slug">): string {
  return `${SITE_URL}/notes/${note.slug}/`;
}
