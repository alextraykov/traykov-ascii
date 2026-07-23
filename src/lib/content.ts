import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Matter = Record<string, string | number | string[]>;

export type CaseStudy = {
  id: string;
  href: string;
  title: string;
  summary: string;
  role?: string;
  year?: number;
  group: string;
  category?: string;
  status?: string;
  tags: string[];
  image?: string;
  readTime?: string;
  walkthroughVideo?: string;
  walkthroughPoster?: string;
  walkthroughLabel?: string;
  order: number;
  sourcePath: string;
  body: string;
};

export type CaseStudyHeading = {
  id: string;
  text: string;
  depth: number;
};

export type Writing = {
  id: string;
  title: string;
  date: string;
  emoji: string;
  body: string;
};

const caseStudyRoot = "./case-studies";

const slugOverrides: Record<string, string> = {
  "pages/designing-pave": "designing-pave",
  "pages/synapse-sys": "synapse-sys",
  "pages/designing-synapse-sys": "designing-synapse-sys",
  "pages/pointlearn": "pointlearn",
  "pages/building-pave-environment": "building-pave-environment",
  "pages/pave-building-loop": "pave-building-loop",
  "pages/pave-planning": "pave-planning",
  "pages/pave-direct-edit": "pave-direct-edit",
  "pages/pave-credits": "pave-credits",
  "pages/pave-marketplace": "pave-marketplace",
  "pages/01-home": "pave-home",
  "pages/02-builder": "pave-builder",
  "pages/landing": "pave-landing",
  "pages/email-templates": "pave-email-templates",
  "pages/notifications": "pave-notifications",
  "pages/billing": "pave-billing",
  "pages/projects": "pave-projects",
  "composites/chat-window": "pave-chat-window",
  "composites/inspector-canvas": "pave-inspector-canvas",
  "composites/billing-plg": "pave-billing-plg",
  "quickbase/connection-central": "connection-central",
  "old-work/bolt-fun": "bolt-fun",
  "old-work/alby-browser": "alby-browser",
  "old-work/brewculator": "brewculator",
  "old-work/the-improved-mind": "the-improved-mind",
  "old-work/we-are-design": "we-are-design"
};

function walkFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) return walkFiles(path, ext);
      return path.endsWith(ext) ? [path] : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseValue(value: string): string | number | string[] {
  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => stripQuotes(item))
      .filter(Boolean);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return stripQuotes(trimmed);
}

export function parseMdx(path: string): { matter: Matter; body: string } {
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) return { matter: {}, body: raw };

  const matter: Matter = {};

  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    matter[pair[1]] = parseValue(pair[2]);
  }

  return { matter, body: match[2] };
}

function stringMatter(value: Matter[string]): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberMatter(value: Matter[string], fallback = 999): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function tagsMatter(value: Matter[string]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "case-study"
  );
}

function contentKey(path: string): string {
  return relative(caseStudyRoot, path).replace(/\\/g, "/").replace(/\.mdx$/, "");
}

function caseSlug(path: string, title: string): string {
  const key = contentKey(path);
  return slugOverrides[key] ?? slugify(key.split("/").pop() || title);
}

function cleanBody(body: string): string {
  return body
    .replace(/^import\s+.+?;\s*$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function readCaseStudy(path: string): CaseStudy | null {
  const key = contentKey(path);
  if (key === "README" || key === "_template" || key.startsWith("_")) return null;

  const { matter, body } = parseMdx(path);
  const title = stringMatter(matter.title);
  const group = stringMatter(matter.group);

  if (!title || !group) return null;

  const id = caseSlug(path, title);

  return {
    id,
    href: `/case-studies/${id}/`,
    title,
    summary: stringMatter(matter.summary) ?? "",
    role: stringMatter(matter.role),
    year: numberMatter(matter.year, 0) || undefined,
    group,
    category: stringMatter(matter.category),
    status: stringMatter(matter.status),
    tags: tagsMatter(matter.tags),
    image: stringMatter(matter.heroImage) ?? stringMatter(matter.image),
    readTime: stringMatter(matter.readTime),
    walkthroughVideo: stringMatter(matter.walkthroughVideo),
    walkthroughPoster: stringMatter(matter.walkthroughPoster),
    walkthroughLabel: stringMatter(matter.walkthroughLabel),
    order: numberMatter(matter.order),
    sourcePath: relative(".", path).replace(/\\/g, "/"),
    body: cleanBody(body)
  };
}

export function getCaseStudies(): CaseStudy[] {
  return walkFiles(caseStudyRoot, ".mdx")
    .map(readCaseStudy)
    .filter((study): study is CaseStudy => Boolean(study))
    .sort((a, b) => a.order - b.order || a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
}

export function getCaseStudyById(id: string): CaseStudy | undefined {
  return getCaseStudies().find((study) => study.id === id);
}

export function getAdjacentCaseStudies(id: string, studies = getCaseStudies()): {
  previous?: CaseStudy;
  next?: CaseStudy;
} {
  const index = studies.findIndex((study) => study.id === id);
  if (index === -1 || studies.length < 2) return {};

  return {
    previous: studies[(index - 1 + studies.length) % studies.length],
    next: studies[(index + 1) % studies.length]
  };
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function linkAttrs(href: string): string {
  return /^https?:\/\//.test(href) ? ' target="_blank" rel="noreferrer"' : "";
}

function inlineMarkdown(value: string): string {
  return esc(value)
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_match, label: string, href: string) => {
      return `<a href="${esc(href)}"${linkAttrs(href)}>${label}</a>`;
    });
}

function plainMarkdownText(value: string): string {
  return value
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyHeading(value: string): string {
  return slugify(plainMarkdownText(value)) || "section";
}

function uniqueHeadingId(value: string, seen: Map<string, number>): string {
  const base = slugifyHeading(value);
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

export function getCaseStudyHeadings(body: string): CaseStudyHeading[] {
  const headings: CaseStudyHeading[] = [];
  const seen = new Map<string, number>();
  let inCode = false;

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const text = plainMarkdownText(match[2]);
    if (!text) continue;

    headings.push({
      id: uniqueHeadingId(text, seen),
      text,
      depth: match[1].length
    });
  }

  return headings;
}

function parseFenceInfo(info: string): { lang: string; attrs: Record<string, string> } {
  const [lang = "", ...rest] = info.trim().split(/\s+/);
  const attrs: Record<string, string> = {};
  const source = rest.join(" ");
  const matches = source.matchAll(/([a-zA-Z][\w-]*):\s*([\s\S]+?)(?=\s+[a-zA-Z][\w-]*:|$)/g);

  for (const match of matches) {
    attrs[match[1]] = match[2].trim();
  }

  return { lang: lang.toLowerCase(), attrs };
}

function renderCodeBlock(lang: string, code: string): string {
  const normalized = lang.toLowerCase();

  if (normalized === "mermaid") {
    return renderStructuredDiagram(code);
  }

  if (normalized === "case-video-copy") {
    return renderCaseVideo(code);
  }

  if (normalized === "case-image-grid") {
    return renderCaseImageGrid(code);
  }

  if (normalized === "case-stat") {
    return renderCaseStat(code);
  }

  if (normalized === "case-quote") {
    return renderCaseQuote(code);
  }

  if (normalized === "case-timeline") {
    return renderCaseTimeline(code);
  }

  return `<pre><code>${esc(code)}</code></pre>`;
}

function parseInlineMetadata(source: string): { attrs: Record<string, string>; body: string } {
  const lines = source.trim().split("\n");
  const attrs: Record<string, string> = {};
  const body: string[] = [];

  for (const line of lines) {
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (pair && body.length === 0) {
      attrs[pair[1]] = pair[2].trim();
    } else {
      body.push(line);
    }
  }

  return { attrs, body: body.join("\n").trim() };
}

function normalizeAssetPath(path: string): string {
  const clean = path.trim();
  if (clean.startsWith("http") || clean.startsWith("/")) return clean;
  if (clean.startsWith("public/")) return clean.replace(/^public/, "");
  return `/${clean}`;
}

function renderCaseVideo(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const file = attrs.file ? normalizeAssetPath(attrs.file) : "";
  const title = attrs.title ?? "Video walkthrough";
  const caption = body || attrs.note || "";

  return `<figure class="case-video-copy">${
    file
      ? `<video src="${esc(file)}" controls muted loop playsinline preload="metadata" data-case-video-autoplay></video>`
      : ""
  }<figcaption><strong>${inlineMarkdown(title)}</strong>${
    caption ? `<em>${inlineMarkdown(caption)}</em>` : ""
  }</figcaption></figure>`;
}

function renderCaseImageGrid(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Image gallery";
  const note = attrs.note ?? "";
  const columns = attrs.columns ?? "2";
  const fitClass = attrs.fit?.toLowerCase() === "contain" ? " case-image-grid--fit-contain" : "";
  const items = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [src = "", itemTitle = "", caption = ""] = line.split("|").map((part) => part.trim());
      return `<figure class="case-image-card"><img src="${esc(normalizeAssetPath(src))}" alt="${esc(
        plainMarkdownText(itemTitle || caption || title)
      )}" loading="lazy" /><figcaption><span>${inlineMarkdown(itemTitle)}</span>${
        caption ? `<em>${inlineMarkdown(caption)}</em>` : ""
      }</figcaption></figure>`;
    })
    .join("");

  return `<figure class="case-image-grid case-image-grid--cols-${esc(columns)}${fitClass}"><figcaption><strong>${inlineMarkdown(
    title
  )}</strong>${note ? `<em>${inlineMarkdown(note)}</em>` : ""}</figcaption><div class="case-image-grid__items">${items}</div></figure>`;
}

function renderCaseStat(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Signal";
  const items = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value = "", label = "", note = ""] = line.split("|").map((part) => part.trim());
      return `<article class="case-stat"><strong data-count-up="${esc(value)}">${inlineMarkdown(
        value
      )}</strong><span>${inlineMarkdown(label)}</span>${note ? `<p>${inlineMarkdown(note)}</p>` : ""}</article>`;
    })
    .join("");

  return `<section class="case-stats" data-reveal-group aria-label="${esc(
    plainMarkdownText(title)
  )}"><p class="case-stats__label">${inlineMarkdown(title)}</p><div class="case-stats__grid">${items}</div></section>`;
}

function renderCaseQuote(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const attribution = attrs.attribution ?? "";
  const role = attrs.role ?? "";
  const quote = body.trim();

  return `<figure class="case-pull-quote" data-reveal="scan"><blockquote>${inlineMarkdown(
    quote
  )}</blockquote>${
    attribution || role
      ? `<figcaption>${attribution ? `<strong>${inlineMarkdown(attribution)}</strong>` : ""}${
          role ? `<span>${inlineMarkdown(role)}</span>` : ""
        }</figcaption>`
      : ""
  }</figure>`;
}

function renderCaseTimeline(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Timeline";
  const items = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date = "", heading = "", note = ""] = line.split("|").map((part) => part.trim());
      return `<li><time>${inlineMarkdown(date)}</time><strong>${inlineMarkdown(heading)}</strong>${
        note ? `<p>${inlineMarkdown(note)}</p>` : ""
      }</li>`;
    })
    .join("");

  return `<section class="case-timeline" data-reveal="rise" aria-label="${esc(
    plainMarkdownText(title)
  )}"><p class="case-timeline__label">${inlineMarkdown(title)}</p><ol>${items}</ol></section>`;
}

function simplifyDiagramLine(line: string): string {
  return line
    .replace(/^\s*(flowchart|graph|stateDiagram-v2|sequenceDiagram)\b.*$/i, "")
    .replace(/^\s*(participant|actor)\s+/i, "")
    .replace(/\[(.*?)\]/g, "$1")
    .replace(/\{(.*?)\}/g, "$1")
    .replace(/\((.*?)\)/g, "$1")
    .replace(/-->|---|->>|-->>|:>/g, " -> ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .replace(/;$/, "")
    .trim();
}

export function renderStructuredDiagram(source: string): string {
  const lines = source
    .split("\n")
    .map(simplifyDiagramLine)
    .filter((line) => line && line !== "end");

  const body = lines.length ? lines.join("\n") : source.trim();
  return `<figure class="ascii-diagram"><pre class="rfc-node"><code>${esc(body)}</code></pre></figure>`;
}

function renderHeading(line: string, seen: Map<string, number>): string | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;

  const depth = Math.min(match[1].length, 6);
  const text = plainMarkdownText(match[2]);
  const id = uniqueHeadingId(text, seen);
  const anchor = depth >= 2 ? ` id="${id}" data-case-heading` : "";
  return `<h${depth}${anchor}>${inlineMarkdown(match[2])}</h${depth}>`;
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^-\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^!\[.*?\]\(.*?\)/.test(line) ||
    /^<[A-Z][A-Za-z0-9]+/.test(line) ||
    line.startsWith("```")
  );
}

function renderList(lines: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const items = lines
    .map((line) => line.replace(ordered ? /^\d+\.\s+/ : /^-\s+/, ""))
    .map((line) => `<li>${inlineMarkdown(line)}</li>`)
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function renderImage(line: string): string | null {
  const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
  if (!match) return null;
  return `<figure class="case-image"><img src="${esc(match[2])}" alt="${esc(match[1])}" loading="lazy" />${
    match[1] ? `<figcaption>${inlineMarkdown(match[1])}</figcaption>` : ""
  }</figure>`;
}

function renderPreviewPlaceholder(line: string): string {
  const match = line.match(/^<([A-Z][A-Za-z0-9]+)/);
  const label = match?.[1] ? match[1].replace(/Preview$/, " preview") : "Prototype preview";
  return `<div class="case-preview-placeholder">${esc(label)} referenced in the source prototype.</div>`;
}

export function renderMarkdown(body: string): string {
  const lines = cleanBody(body).split("\n");
  const html: string[] = [];
  const headingIds = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const { lang, attrs } = parseFenceInfo(trimmed.slice(3));
      const fenceLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        fenceLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      const code = [Object.entries(attrs).map(([key, value]) => `${key}: ${value}`).join("\n"), fenceLines.join("\n")]
        .filter(Boolean)
        .join("\n");
      html.push(renderCodeBlock(lang, code));
      continue;
    }

    const heading = renderHeading(trimmed, headingIds);
    if (heading) {
      html.push(heading);
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map((part) => `<p>${inlineMarkdown(part)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim());
        index += 1;
      }
      html.push(renderList(items, false));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim());
        index += 1;
      }
      html.push(renderList(items, true));
      continue;
    }

    const image = renderImage(trimmed);
    if (image) {
      html.push(image);
      index += 1;
      continue;
    }

    if (/^<[A-Z][A-Za-z0-9]+/.test(trimmed)) {
      html.push(renderPreviewPlaceholder(trimmed));
      index += 1;
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}

export function getWriting(): Writing[] {
  return walkFiles("./src/content/writing", ".mdx").map((file) => {
    const { matter, body } = parseMdx(file);
    const id = file.split("/").pop()?.replace(/\.mdx$/, "") ?? "writing";
    return {
      id,
      title: stringMatter(matter.title) ?? id,
      date: stringMatter(matter.date) ?? "",
      emoji: stringMatter(matter.emoji) ?? "",
      body
    };
  });
}
