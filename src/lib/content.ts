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

  if (normalized === "case-compare") {
    return renderCaseCompare(code);
  }

  if (normalized === "case-live") {
    return renderCaseLive(code);
  }

  if (normalized === "case-facts") {
    return renderCaseFacts(code);
  }

  if (normalized === "case-swatches") {
    return renderCaseSwatches(code);
  }

  if (normalized === "case-tree") {
    return renderCaseTree(code);
  }

  if (normalized === "case-link") {
    return renderCaseLink(code);
  }

  if (normalized === "case-quotes") {
    return renderCaseQuotes(code);
  }

  if (normalized === "case-slider") {
    return renderCaseSlider(code);
  }

  if (normalized === "case-lens") {
    return renderCaseLens(code);
  }

  if (normalized === "case-live-switcher") {
    return renderCaseLiveSwitcher(code);
  }

  if (normalized === "case-gallery") {
    return renderCaseGallery(code);
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
      ? `<video src="${esc(file)}" controls muted loop playsinline preload="none" data-case-video-autoplay></video>`
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
  const title = attrs.title ?? "";
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
    plainMarkdownText(title || "Key numbers")
  )}">${title ? `<p class="case-stats__label">${inlineMarkdown(title)}</p>` : ""}<div class="case-stats__grid">${items}</div></section>`;
}

function renderCaseQuote(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const attribution = attrs.attribution ?? "";
  const role = attrs.role ?? "";
  const quote = body.trim();
  const source_ = [attribution, role].filter(Boolean).map((part) => inlineMarkdown(part)).join(", ");

  return `<figure class="case-pull-quote" data-reveal="rise"><blockquote>${inlineMarkdown(quote)}</blockquote>${
    source_ ? `<figcaption><span>${source_}</span></figcaption>` : ""
  }</figure>`;
}

// The study's facts in one strip. Rows: label | value.
function renderCaseFacts(source: string): string {
  const items = splitRows(source)
    .map(([label = "", value = ""]) => `<div><dt>${esc(label)}</dt><dd>${inlineMarkdown(value)}</dd></div>`)
    .join("");
  return `<dl class="case-facts">${items}</dl>`;
}

// Colour layers as swatches. Rows: name | light hex | dark hex | what sits on it.
// The stacks beside them nest the layers in their real colours, light and dark.
function renderCaseSwatches(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const rows = splitRows(body).filter((row) => row.length >= 3);
  const hex = (value: string) => (/^#[0-9a-f]{3,8}$/i.test(value) ? value : "transparent");
  const chip = (value: string, theme: string) =>
    `<span class="case-swatches__chip" style="--swatch: ${esc(hex(value))}"><i aria-hidden="true"></i><code>${esc(
      value
    )}</code><span class="visually-hidden"> in ${theme}</span></span>`;
  const list = rows
    .map(
      ([name = "", light = "", dark = "", use = ""], index) =>
        `<li style="--layer: ${index}"><strong>${esc(name)}</strong>${chip(light, "light")}${chip(dark, "dark")}${
          use ? `<span class="case-swatches__use">${inlineMarkdown(use)}</span>` : ""
        }</li>`
    )
    .join("");
  const stack = (label: string, dark: boolean) =>
    `<div class="case-swatches__stack" aria-hidden="true">${rows
      .map(([, light = "", darkHex = ""], index) => `<i style="--swatch: ${esc(hex(dark ? darkHex : light))}; --layer: ${index}"></i>`)
      .join("")}<span>${label}</span></div>`;
  return `<figure class="case-swatches" data-reveal="rise">${
    attrs.title ? `<figcaption class="case-figure-head"><strong>${inlineMarkdown(attrs.title)}</strong></figcaption>` : ""
  }<div class="case-swatches__body"><ul>${list}</ul><div class="case-swatches__stacks">${stack("Light", false)}${stack(
    "Dark",
    true
  )}</div></div></figure>`;
}

// One line splitting into every explored direction and converging on the chosen one.
// Header: start: src | label, end: src | label, dir: thumbnail folder. Rows: family | stem, stem, ...
function renderCaseTree(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const families = splitRows(body).map(
    ([label = "", list = ""]) => [label, list.split(",").map((stem) => stem.trim()).filter(Boolean)] as const
  );
  const dir = normalizeAssetPath(attrs.dir ?? "");
  const [startSrc = "", startLabel = ""] = (attrs.start ?? "").split("|").map((part) => part.trim());
  const [endSrc = "", endLabel = ""] = (attrs.end ?? "").split("|").map((part) => part.trim());
  const W = 1728;
  const H = 560;
  const cy = H / 2;
  const x0 = 236;
  const xf = 1384;
  const t0 = 352;
  const step = 150;
  const ys = families.map((_, row) => 64 + row * ((H - 128) / Math.max(1, families.length - 1)));
  const paths = ys
    .map(
      (y, row) =>
        `<path class="case-tree__branch" style="--row: ${row}" pathLength="1" d="M${x0},${cy} H${x0 + 40} C${x0 + 96},${cy} ${x0 + 70},${y} ${
          t0 - 20
        },${y} H${xf - 120} C${xf - 60},${y} ${xf - 84},${cy} ${xf},${cy}"/>`
    )
    .join("");
  const thumbs = families
    .map(
      ([label, list], row) =>
        `<span class="case-tree__family" style="left: ${t0 - 6}px; top: ${ys[row] - 60}px; --row: ${row}">${esc(label)}</span>` +
        list
          .map(
            (stem, k) =>
              `<img class="case-tree__thumb" src="${esc(`${dir}${stem}.webp`)}" alt="" loading="lazy" decoding="async" style="left: ${
                t0 + k * step
              }px; top: ${ys[row] - 42}px; --row: ${row}; --k: ${k}">`
          )
          .join("")
    )
    .join("");
  const total = families.reduce((sum, [, list]) => sum + list.length, 0);
  return `<figure class="case-tree" data-case-tree style="--case-live-width: ${W}; --case-live-vh: ${H}">${
    attrs.title ? `<figcaption class="case-figure-head"><strong>${inlineMarkdown(attrs.title)}</strong></figcaption>` : ""
  }<div class="case-tree__viewport" role="img" aria-label="${esc(
    `${startLabel}, then ${total} coded directions in ${families.length} families, converging on ${endLabel}`
  )}"><div class="case-tree__stage"><svg class="case-tree__lines" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path class="case-tree__trunk" pathLength="1" d="M${
    x0 - 6
  },${cy} H${x0 + 40}"/>${paths}</svg><div class="case-tree__node case-tree__node--start" style="top: ${cy - 78}px"><img src="${esc(
    normalizeAssetPath(startSrc)
  )}" alt="" loading="lazy"><span>${esc(startLabel)}</span></div>${thumbs}<div class="case-tree__node case-tree__node--end" style="top: ${
    cy - 112
  }px"><img src="${esc(normalizeAssetPath(endSrc))}" alt="" loading="lazy"><span>${esc(endLabel)}</span></div></div></div></figure>`;
}

// A big outbound link, for the one place a reader should go next.
function renderCaseLink(source: string): string {
  const [label = "", href = "", note = ""] = (splitRows(source)[0] ?? []);
  return `<p class="case-link"><a class="case-link__a" href="${esc(href)}" target="_blank" rel="noopener">${esc(
    label
  )}<span aria-hidden="true"> ↗</span></a>${note ? `<span>${inlineMarkdown(note)}</span>` : ""}</p>`;
}

const TIMELINE_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "28 Sep" → a day number for spacing; dates in other shapes simply get no gap.
function timelineDay(date: string): number | null {
  const match = date.trim().match(/^(\d{1,2})\s+([a-z]{3})/i);
  if (!match) return null;
  const month = TIMELINE_MONTHS.indexOf(match[2].toLowerCase());
  if (month < 0) return null;
  return Date.UTC(2001, month, Number(match[1])) / 86400000;
}

// Vertical timeline on a rail of day cells (component specimen 36 · B). Each event's mark sits on
// its date line; under it hangs one 7 px cell per day until the next event, so the gaps show the
// pace. The last event has no cells and the dotted spine stops at its mark. case-media.js lights
// the cells and marks as the reader reaches them; without JS every entry and cell is at rest.
function timelineRelative(day: number | null, previous: number | null, index: number): string {
  if (index === 0) return "Start";
  if (day === null || previous === null) return "";
  const gap = day - previous;
  if (gap <= 0) return "Same day";
  if (gap === 1) return "Next day";
  return `${gap} days later`;
}

function renderCaseTimeline(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Timeline";
  const rows = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
  const days = rows.map(([date = ""]) => timelineDay(date));
  const items = rows
    .map(([date = "", heading = "", note = ""], index) => {
      const day = days[index];
      const next = index < rows.length - 1 ? days[index + 1] : null;
      // One cell per day that passes before the next event; the last cell is the next event's day.
      const count = day !== null && next !== null ? Math.max(0, Math.min(14, next - day)) : 0;
      const relative = timelineRelative(day, index > 0 ? days[index - 1] : null, index);
      const rail = `<span class="case-timeline__rail" aria-hidden="true"><i class="cell case-timeline__mark" data-level="8"></i>${
        count ? `<span class="case-timeline__days">${'<i class="cell case-timeline__day" data-level="3"></i>'.repeat(count)}</span>` : ""
      }</span>`;
      return `<li data-case-timeline-item>${rail}<div class="case-timeline__entry"><p class="case-timeline__when"><time data-scramble data-scramble-trigger="reveal">${inlineMarkdown(
        date
      )}</time>${relative ? `<span>${esc(relative)}</span>` : ""}</p><strong>${inlineMarkdown(heading)}</strong>${
        note ? `<p>${inlineMarkdown(note)}</p>` : ""
      }</div></li>`;
    })
    .join("");

  return `<section class="case-timeline" data-case-timeline aria-label="${esc(
    plainMarkdownText(title)
  )}"><ol>${items}</ol></section>`;
}

// Quote carousel. Rows: attribution | quote. case-media.js turns the list into a self-advancing
// carousel with a meter per quote; without JS every quote stays readable as a list.
function renderCaseQuotes(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "What people said";
  const rows = splitRows(body).filter((row) => row.length >= 2);
  const slides = rows
    .map(
      ([attribution = "", ...rest], index) =>
        `<li class="case-quotes__slide" data-case-quote-slide="${index}" role="group" aria-roledescription="slide" aria-label="${
          index + 1
        } of ${rows.length}"><blockquote>${inlineMarkdown(rest.join(" | "))}</blockquote><p class="case-quotes__by" data-scramble data-scramble-trigger="reveal">${inlineMarkdown(
          attribution
        )}</p></li>`
    )
    .join("");
  const meters = rows
    .map(
      (_, index) =>
        `<button type="button" class="case-quotes__meter" data-case-quote-go="${index}" aria-label="Quote ${index + 1} of ${
          rows.length
        }"><span></span></button>`
    )
    .join("");

  return `<section class="case-quotes" data-case-quotes aria-roledescription="carousel" aria-label="${esc(
    plainMarkdownText(title)
  )}"><ol class="case-quotes__stage" aria-live="polite">${slides}</ol><div class="case-quotes__controls" data-case-quotes-controls hidden><div class="case-quotes__meters">${meters}</div><button type="button" class="case-quotes__step" data-case-quote-step="-1" aria-label="Previous quote">←</button><button type="button" class="case-quotes__step" data-case-quote-pause aria-pressed="false">Pause</button><button type="button" class="case-quotes__step" data-case-quote-step="1" aria-label="Next quote">→</button></div></section>`;
}

// The grip's cell chevrons ("‹ ›", 5 × 3 cells), drawn in markup so they need no script.
const SLIDER_GRIP = `<span class="case-slider__grip" aria-hidden="true"><span class="cell-icon" style="--cells: 5; --cell-size: 4px; --icon-cell: 4px">${[
  0, 8, 0, 8, 0, 8, 0, 0, 0, 8, 0, 8, 0, 8, 0
]
  .map((level) => `<i class="cell cell--clear" data-level="${level}"></i>`)
  .join("")}</span></span>`;

// Drag-to-compare (component specimen 30 · B). Rows: label | src | tag. "{theme}" in a src is
// swapped by the theme switch. The caption sits in the header row with the switch beside it.
function renderCaseSlider(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Before and after";
  const rows = splitRows(body).slice(0, 2);
  // options: build=Build, home=Home swaps "{option}" in a src; themes: light, dark swaps "{theme}".
  const optionPairs = (attrs.options ?? attrs.themes ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [value = "", label = ""] = part.split("=").map((piece) => piece.trim());
      return [value, label || value.charAt(0).toUpperCase() + value.slice(1)] as const;
    });
  const token = attrs.options ? "{option}" : "{theme}";
  const themes = optionPairs.map(([value]) => value);
  const theme = themes[0] ?? "";
  const resolve = (src: string) => normalizeAssetPath(src.replace(token, theme));
  const [before = [], after = []] = rows;
  const image = ([label = "", src = ""]: string[], role: string) =>
    `<img class="case-slider__${role}" src="${esc(resolve(src))}" data-case-slider-src="${esc(
      normalizeAssetPath(src)
    )}" alt="${esc(plainMarkdownText(`${title}: ${label}`))}" loading="lazy" />`;
  // Corner labels are plain words; a tag that repeats the label ("Before" / "Before") is shown once.
  const corner = ([label = "", , tag = ""]: string[], role: string) =>
    `<span class="case-slider__corner case-slider__corner--${role}" data-case-slider-corner="${role}">${esc(
      tag && tag.toLowerCase() !== label.toLowerCase() ? `${label} · ${tag}` : label || tag
    )}</span>`;
  const themeButtons = optionPairs.map(
    ([value, label], index) =>
      `<button type="button" aria-pressed="${index === 0 ? "true" : "false"}" data-case-slider-theme="${esc(value)}">${esc(
        label
      )}</button>`
  );
  const note = [attrs.note, attrs.caption].filter(Boolean).join(" ");

  return `<figure class="case-slider" data-case-slider data-case-slider-token="${esc(token)}" style="--split: 50%">${renderCaseFigureHeader(
    title,
    note
  )}${themes.length > 1 ? renderCaseSwitch(`${title}: theme`, themeButtons, "data-case-slider-switch") : ""}<div class="case-slider__stage">${image(
    before,
    "before"
  )}${image(after, "after")}${corner(before, "before")}${corner(
    after,
    "after"
  )}<span class="case-slider__handle" aria-hidden="true"></span>${SLIDER_GRIP}<input class="case-slider__range" type="range" min="0" max="100" value="50" aria-label="${esc(
    `Drag to compare ${before[0] ?? "before"} and ${after[0] ?? "after"}`
  )}" data-case-slider-range hidden /></div></figure>`;
}

// An x-ray lens (component specimen 30 · B): the base image, with the second image revealed inside
// a square under the pointer and the rest of the picture dimmed. Rows: label | src. The switch
// shows the whole second image for keyboard and touch.
function renderCaseLens(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "X-ray";
  const [base = [], lens = []] = splitRows(body);
  const note = [attrs.note, attrs.caption].filter(Boolean).join(" ");
  return `<figure class="case-lens" data-case-lens>${renderCaseFigureHeader(title, note)}${renderCaseSwitch(
    title,
    [
      `<button type="button" aria-pressed="true" data-case-lens-base>${esc(base[0] || "Lens")}</button>`,
      `<button type="button" aria-pressed="false" data-case-lens-toggle>${esc(lens[0] || "X-ray")}</button>`
    ],
    "data-case-lens-switch"
  )}<div class="case-lens__stage"><img src="${esc(normalizeAssetPath(base[1] ?? ""))}" alt="${esc(
    plainMarkdownText(`${title}: ${base[0] ?? ""}`)
  )}" loading="lazy" /><img class="case-lens__xray" src="${esc(normalizeAssetPath(lens[1] ?? ""))}" alt="${esc(
    plainMarkdownText(`${title}: ${lens[0] ?? ""}`)
  )}" loading="lazy" /><span class="case-lens__dim" aria-hidden="true"></span><span class="case-lens__frame" aria-hidden="true"></span></div></figure>`;
}

function splitRows(body: string): string[][] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
}

function renderCaseTag(tag: string): string {
  if (!tag) return "";
  const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `<span class="case-tag case-tag--${esc(slug)}">${esc(tag)}</span>`;
}

function renderCaseFigureHeader(title: string, note: string, tag = ""): string {
  return `<figcaption class="case-figure-head"><strong>${inlineMarkdown(title)}${tag ? ` ${renderCaseTag(tag)}` : ""}</strong>${
    note ? `<em>${inlineMarkdown(note)}</em>` : ""
  }</figcaption>`;
}

function renderCaseSwitch(label: string, buttons: string[], attr: string): string {
  return `<div class="case-figure-tools"><div class="case-switch" role="group" aria-label="${esc(
    plainMarkdownText(label)
  )}" ${attr} hidden>${buttons.join("")}</div></div>`;
}

function renderCaseMedia(src: string, alt: string, poster = ""): string {
  const path = normalizeAssetPath(src);
  if (/\.mp4(\?|$)/i.test(path)) {
    return `<video src="${esc(path)}"${
      poster ? ` poster="${esc(normalizeAssetPath(poster))}"` : ""
    } muted loop playsinline preload="none" controls aria-label="${esc(alt)}" data-case-video-autoplay></video>`;
  }
  return `<img src="${esc(path)}" alt="${esc(alt)}" loading="lazy" />`;
}

// Before/after (or any N-way) switch. Rows: Label | src | caption | tag | poster.
// Without JS every panel stays visible and the switch stays hidden.
function renderCaseCompare(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Before and after";
  const fit = attrs.fit?.toLowerCase() === "contain" ? " case-compare--contain" : "";
  const rows = splitRows(body);
  const buttons = rows.map(
    ([label = ""], index) =>
      `<button type="button" aria-pressed="${index === 0 ? "true" : "false"}" data-case-compare-option="${index}">${esc(
        label
      )}</button>`
  );
  const panels = rows
    .map(([label = "", src = "", caption = "", tag = "", poster = ""], index) => {
      const alt = plainMarkdownText(caption || `${title}: ${label}`);
      return `<div class="case-compare__panel" data-case-compare-panel="${index}" data-active="${
        index === 0 ? "true" : "false"
      }"><div class="case-compare__media">${renderCaseMedia(src, alt, poster)}</div><p class="case-compare__caption">${
        // A tag that repeats the label ("Before" / "Before") is shown once, as the status chip.
        tag && tag.toLowerCase() === label.toLowerCase()
          ? renderCaseTag(tag)
          : `<span class="case-compare__label">${esc(label)}</span>${renderCaseTag(tag)}`
      }${caption ? `<span>${inlineMarkdown(caption)}</span>` : ""}</p></div>`;
    })
    .join("");

  return `<figure class="case-compare${fit}" data-case-compare>${renderCaseFigureHeader(
    title,
    attrs.note ?? ""
  )}${renderCaseSwitch(title, buttons, "data-case-compare-switch")}<div class="case-compare__stage">${panels}</div></figure>`;
}

const EXPAND_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" shape-rendering="crispEdges"><path d="M2 2h5v2H4v3H2zM9 2h5v5h-2V4H9zM2 9h2v3h3v2H2zM12 9h2v5H9v-2h3z" fill="currentColor"/></svg>`;

// width: renders the demo at a desktop viewport and scales it to fit, so it is never cropped.
function renderCaseLiveFrame(src: string, title: string, height: string, fallback: string, width = ""): string {
  const frameHeight = /^\d+$/.test(height) ? height : "560";
  const virtualWidth = /^\d+$/.test(width) ? width : "";
  const sizing = virtualWidth
    ? `--case-live-width: ${esc(virtualWidth)}; --case-live-vh: ${esc(frameHeight)}`
    : `--case-live-height: ${esc(frameHeight)}px`;
  return `<div class="case-live__frame${virtualWidth ? " case-live__frame--scaled" : ""}" style="${sizing}"${
    virtualWidth ? " data-case-live-scaled" : ""
  }>${
    fallback
      ? `<img class="case-live__fallback" src="${esc(normalizeAssetPath(fallback))}" alt="" loading="lazy" />`
      : ""
  }<iframe title="${esc(title)}" data-case-live-src="${esc(normalizeAssetPath(src))}" loading="lazy" tabindex="-1"></iframe><a class="case-live__open" href="${esc(
    normalizeAssetPath(src)
  )}" target="_blank" rel="noopener" data-case-live-open aria-label="${esc(`Open ${plainMarkdownText(title)} full screen`)}" title="Open full screen">${EXPAND_ICON}</a></div>`;
}

// Lazy prototype embed. The iframe only loads near the viewport and unloads far from it.
function renderCaseLive(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Live prototype";
  const src = attrs.src ?? "";
  const caption = body || attrs.note || "";

  return `<figure class="case-live" data-case-live>${renderCaseLiveFrame(
    src,
    title,
    attrs.height ?? "",
    attrs.fallback ?? "",
    attrs.width ?? ""
  )}${
    attrs.slides
      ? `<div class="case-live__deck" data-case-deck="${esc(attrs.slides)}" hidden><button type="button" data-case-deck-step="-1">← Previous</button><output data-case-deck-count>Slide 1 of ${esc(
          attrs.slides
        )}</output><button type="button" data-case-deck-step="1">Next →</button></div>`
      : ""
  }<figcaption><strong>${inlineMarkdown(title)} ${renderCaseTag(attrs.tag ?? "")}</strong>${
    caption ? `<em>${inlineMarkdown(caption)}</em>` : ""
  }</figcaption></figure>`;
}

// One prototype iframe plus buttons that swap a query value. Rows: value | label | tag.
function renderCaseLiveSwitcher(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Live states";
  const base = attrs.base ?? "";
  const rows = splitRows(body);
  const first = rows[0]?.[0] ?? "";
  const buttons = rows.map(
    ([value = "", label = "", tag = ""], index) =>
      `<button type="button" aria-pressed="${index === 0 ? "true" : "false"}" data-case-live-value="${esc(
        value
      )}" data-case-live-tag="${esc(tag)}">${esc(label || value)}${tag ? ` <small>${esc(tag)}</small>` : ""}</button>`
  );
  const noScriptList = rows
    .map(
      ([value = "", label = "", tag = ""]) =>
        `<li><a href="${esc(normalizeAssetPath(base + value))}" target="_blank" rel="noopener">${esc(label || value)}</a> ${renderCaseTag(
          tag
        )}</li>`
    )
    .join("");

  return `<figure class="case-live case-live--switcher" data-case-live data-case-live-base="${esc(
    normalizeAssetPath(base)
  )}">${renderCaseFigureHeader(title, attrs.note ?? "")}${renderCaseSwitch(
    title,
    buttons,
    "data-case-live-switch"
  )}<ul class="case-live__states" data-case-live-fallback-list>${noScriptList}</ul>${renderCaseLiveFrame(
    base + first,
    title,
    attrs.height ?? "",
    attrs.fallback ?? "",
    attrs.width ?? ""
  )}<figcaption><span data-case-live-current>${renderCaseTag(rows[0]?.[2] ?? "")}</span>${
    attrs.caption ? `<em>${inlineMarkdown(attrs.caption)}</em>` : ""
  }</figcaption></figure>`;
}

// Image grid with a theme switch. Rows: file stem | label. Files: <dir><stem>-<theme>.<ext>.
function renderCaseGallery(source: string): string {
  const { attrs, body } = parseInlineMetadata(source);
  const title = attrs.title ?? "Gallery";
  const dir = attrs.dir ?? "";
  const ext = attrs.ext ?? "webp";
  const themes = (attrs.themes ?? "light, dark").split(",").map((theme) => theme.trim()).filter(Boolean);
  const buttons = themes.map(
    (theme, index) =>
      `<button type="button" aria-pressed="${index === 0 ? "true" : "false"}" data-case-gallery-theme="${esc(theme)}">${esc(
        theme.charAt(0).toUpperCase() + theme.slice(1)
      )}</button>`
  );
  const items = splitRows(body)
    .map(([stem = "", label = ""]) => {
      const sources = themes.map((theme) => `${normalizeAssetPath(dir)}${stem}-${theme}.${ext}`);
      return `<figure class="case-image-card"><img src="${esc(sources[0])}" alt="${esc(
        label || stem
      )}" loading="lazy" ${themes
        .map((theme, index) => `data-case-gallery-${esc(theme)}="${esc(sources[index])}"`)
        .join(" ")} /><figcaption><span>${esc(label || stem)}</span></figcaption></figure>`;
    })
    .join("");

  return `<figure class="case-gallery case-image-grid case-image-grid--cols-${esc(
    attrs.columns ?? "3"
  )}" data-case-gallery>${renderCaseFigureHeader(title, attrs.note ?? "", attrs.tag ?? "")}${renderCaseSwitch(title, buttons, "data-case-gallery-switch")}<div class="case-image-grid__items">${items}</div></figure>`;
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
