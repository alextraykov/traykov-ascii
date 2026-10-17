import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { PRIVATE_WORK_MAX_MEDIA_BYTES } from "./config.js";

const PAGE_FILE_PATTERN = /^pages\/[A-Za-z0-9_-]+\.html$/;
const MEDIA_FILE_PATTERN = /^media\/[A-Za-z0-9_-]+\.(?:avif|gif|jpe?g|mp4|png|webm|webp)$/;
const DEMO_FILE_PATTERN = /^demos\/[A-Za-z0-9_-]+\.html$/;
const DEMO_ASSET_PATTERN = /^demo-assets\/[A-Za-z0-9_-]+\.(?:woff2|js|css)$/;
const DEMO_ASSET_TYPES = { woff2: "font/woff2", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8" };
const MEDIA_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/;
const SAFE_STYLE_PATH = /^\/_astro\/[A-Za-z0-9._-]+\.css$/;
const REQUIRED_PAGE_SLUGS = new Set(["pave-unified-building", "pave-redesign"]);

function unavailableBundle() {
  return { availability: "unavailable", pages: [], media: new Map(), styles: [] };
}

function inside(root, file) {
  const relative = resolve(root, file).slice(resolve(root).length + 1);
  return relative && !relative.startsWith(`..${sep}`) && relative !== "..";
}

function safeFile(root, relativePath, pattern) {
  if (typeof relativePath !== "string" || !pattern.test(relativePath)) return undefined;
  const file = resolve(root, relativePath);
  return inside(root, file) ? file : undefined;
}

function isText(value, maxLength = 20_000) {
  return typeof value === "string" && value.length <= maxLength;
}

function validPage(page, root) {
  return (
    page &&
    REQUIRED_PAGE_SLUGS.has(String(page.slug ?? "")) &&
    MEDIA_ID_PATTERN.test(String(page.slug ?? "")) &&
    isText(page.title, 240) &&
    isText(page.summary, 1_000) &&
    isText(page.status, 120) &&
    isText(page.readTime, 120) &&
    Boolean(safeFile(root, page.htmlFile, PAGE_FILE_PATTERN))
  );
}

function validMedia(media, root) {
  const file = safeFile(root, media?.file, MEDIA_FILE_PATTERN);
  if (!file || !MEDIA_ID_PATTERN.test(String(media?.id ?? "")) || !isText(media?.contentType, 120)) return undefined;

  try {
    const size = statSync(file).size;
    if (!Number.isInteger(size) || size < 1 || size > PRIVATE_WORK_MAX_MEDIA_BYTES) return undefined;
    return { ...media, file: media.file, size };
  } catch {
    return undefined;
  }
}

function validShell(shell) {
  // Generated only from neutral Astro templates, never the private source input.
  return shell?.version === 2 &&
    [shell.casePage, shell.collectionPage, shell.accessPage, shell.tocItem, shell.card]
      .every((part) => isText(part, 250_000)) &&
    [shell.casePage, shell.collectionPage].every((page) =>
      /^<!doctype html>/i.test(page) && page.includes("__PRIVATE_BODY__") &&
      page.includes("__PRIVATE_TITLE__") && page.includes("data-motion-toggle") &&
      !/<(?:iframe|object|embed|base)\b/i.test(page) && !/\/_vercel\/|vercel-insights/i.test(page)) &&
    shell.casePage.includes("__PRIVATE_TOC_ITEMS__") &&
    shell.tocItem.includes("__PRIVATE_HEADING_ID__") &&
    shell.card.includes("__PRIVATE_CARD_TITLE__") &&
    !/<(?:iframe|object|embed|base)\b/i.test(shell.accessPage);
}

export function getPrivateWorkBundleRoot(env = process.env) {
  return resolve(env.PRIVATE_WORK_BUNDLE_DIR || ".private-work");
}

export function readPrivateWorkBundle(env = process.env) {
  const root = getPrivateWorkBundleRoot(env);
  const manifestFile = resolve(root, "manifest.json");
  if (!existsSync(manifestFile)) return unavailableBundle();

  try {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    if (manifest?.version !== 1 || manifest?.availability !== "ready" || !Array.isArray(manifest.pages)) {
      return unavailableBundle();
    }

    if (!validShell(manifest.shell)) return unavailableBundle();

    const pages = manifest.pages.filter((page) => validPage(page, root));
    const pageSlugs = new Set(pages.map((page) => page.slug));
    if (
      pages.length !== REQUIRED_PAGE_SLUGS.size ||
      pages.length !== manifest.pages.length ||
      pageSlugs.size !== REQUIRED_PAGE_SLUGS.size
    ) {
      return unavailableBundle();
    }

    const media = new Map();
    for (const item of manifest.media ?? []) {
      const validated = validMedia(item, root);
      if (!validated || media.has(validated.id)) return unavailableBundle();
      media.set(validated.id, validated);
    }

    const demos = new Map();
    for (const item of manifest.demos ?? []) {
      const file = safeFile(root, item?.htmlFile, DEMO_FILE_PATTERN);
      if (!file || !MEDIA_ID_PATTERN.test(String(item.id ?? "")) || demos.has(item.id)) return unavailableBundle();
      const size = statSync(file).size;
      if (size < 1 || size > PRIVATE_WORK_MAX_MEDIA_BYTES) return unavailableBundle();
      demos.set(item.id, { ...item, size });
    }
    const demoAssets = new Map();
    for (const item of manifest.demoAssets ?? []) {
      const file = safeFile(root, item?.file, DEMO_ASSET_PATTERN);
      if (!file || !MEDIA_ID_PATTERN.test(String(item.id ?? "")) || demoAssets.has(item.id) || item.contentType !== DEMO_ASSET_TYPES[item.file.split(".").at(-1)]) return unavailableBundle();
      const size = statSync(file).size;
      if (size < 1 || size > PRIVATE_WORK_MAX_MEDIA_BYTES) return unavailableBundle();
      demoAssets.set(item.id, { ...item, size });
    }

    const styles = Array.isArray(manifest.styles)
      ? manifest.styles.filter((style) => SAFE_STYLE_PATH.test(String(style)))
      : [];

    return {
      availability: "ready",
      root,
      styles,
      collection: isText(manifest.collection?.intro, 1_000) ? { intro: manifest.collection.intro } : { intro: "" },
      pages,
      shell: manifest.shell,
      demos,
      demoAssets,
      media
    };
  } catch {
    return unavailableBundle();
  }
}

export function bundlePageFile(bundle, page) {
  return safeFile(bundle.root, page.htmlFile, PAGE_FILE_PATTERN);
}

export function bundleMediaFile(bundle, media) {
  return safeFile(bundle.root, media.file, MEDIA_FILE_PATTERN);
}

export function bundleDemoFile(bundle, demo) {
  return safeFile(bundle.root, demo.htmlFile, DEMO_FILE_PATTERN);
}

export function bundleDemoAssetFile(bundle, asset) {
  return safeFile(bundle.root, asset.file, DEMO_ASSET_PATTERN);
}
