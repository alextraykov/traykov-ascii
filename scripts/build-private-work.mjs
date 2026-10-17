import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVATE_WORK_MAX_MEDIA_BYTES } from "../server/private-work/config.js";
import { demoHtml } from "../server/private-work/html.js";
import { readPrivateWorkBundle } from "../server/private-work/bundle.js";

const sourceRoot = resolve("private-work-source");
const outputRoot = resolve(".private-work");
const distRoot = resolve("dist");
const sourceManifestName = "manifest.json";
const sourcePagePattern = /^pages\/[A-Za-z0-9_-]+\.html$/;
const sourceMediaPattern = /^media\/[A-Za-z0-9_-]+\.(?:avif|gif|jpe?g|mp4|png|webm|webp)$/;
const idPattern = /^[A-Za-z0-9_-]{1,96}$/;
const requiredPageSlugs = new Set(["pave-unified-building", "pave-redesign"]);
const allowedMediaTypes = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function within(root, file) {
  const relativePath = relative(root, file);
  return relativePath && !relativePath.startsWith(`..${sep}`) && relativePath !== "..";
}

function sourceFile(root, file, pattern, label) {
  assert(typeof file === "string" && pattern.test(file), `Invalid ${label} path.`);
  const target = resolve(root, file);
  assert(within(root, target), `Invalid ${label} path.`);
  assert(existsSync(target) && statSync(target).isFile(), `Missing ${label}.`);
  return target;
}

function shortText(value, label, maxLength) {
  assert(typeof value === "string" && value.trim() && value.length <= maxLength, `Invalid ${label}.`);
  return value.trim();
}

function pageTextLength(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

function extractStyles(root) {
  const entry = resolve(root, "private-access", "index.html");
  if (!existsSync(entry)) return [];
  const html = readFileSync(entry, "utf8");
  const styles = new Set();
  for (const match of html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (/^\/_astro\/[A-Za-z0-9._-]+\.css$/.test(href)) styles.add(href);
  }
  return [...styles];
}

// These neutral documents are rendered by the same Astro component as public
// cases. Only the authenticated server inserts reviewed private content.
export function extractPrivateShell(root, { fixture = false } = {}) {
  const caseFile = resolve(root, "private-case-template", "index.html");
  const collectionFile = resolve(root, "private-collection-template", "index.html");
  const accessFile = resolve(root, "private-access", "index.html");
  if (fixture && !existsSync(caseFile)) {
    const built = readPrivateWorkBundle({ ...process.env, PRIVATE_WORK_BUNDLE_DIR: outputRoot });
    assert(built.shell?.version === 2, "Build the shared public/private templates before browser fixtures.");
    return built.shell;
  }
  assert([caseFile, collectionFile, accessFile].every(existsSync), "Build the shared public/private templates before the private bundle.");
  let casePage = readFileSync(caseFile, "utf8");
  let collectionPage = readFileSync(collectionFile, "utf8");
  const accessPage = readFileSync(accessFile, "utf8");
  const tocRegion = casePage.match(/<!--PRIVATE_TOC_START-->([\s\S]*?)<!--PRIVATE_TOC_END-->/);
  const cardRegion = collectionPage.match(/<template\b[^>]*data-private-card-template[^>]*>([\s\S]*?)<\/template>/);
  assert(tocRegion?.[1] && cardRegion?.[1], "Shared private template marker regions are missing.");
  casePage = casePage.replace(tocRegion[0], "__PRIVATE_TOC_ITEMS__");
  collectionPage = collectionPage.replace(cardRegion[0], "");
  for (const page of [casePage, collectionPage]) {
    for (const token of ["__PRIVATE_CASE_ID__", "__PRIVATE_TITLE__", "__PRIVATE_SUMMARY__", "__PRIVATE_BODY__", "__PRIVATE_META__", "/__PRIVATE_PATH__/"]) {
      assert(page.includes(token), `Shared private template is missing ${token}.`);
    }
    assert(!/<(?:iframe|object|embed)\b/i.test(page), "Private templates must not load embedded third-party content.");
    assert(!/\/_vercel\/|vercel-insights|data-astro-source-file=["'][^"']*private-work-source/i.test(page), "Private templates must not include analytics or source content.");
  }
  return { version: 2, casePage, collectionPage, accessPage, tocItem: tocRegion[1], card: cardRegion[1] };
}

function removePublicTemplates(root) {
  for (const name of ["private-case-template", "private-collection-template"]) {
    rmSync(resolve(root, name), { recursive: true, force: true });
  }
}

function privateMarkers(manifest, root) {
  const markers = new Set();
  for (const page of manifest.pages ?? []) {
    for (const value of [page.title, page.summary, page.status, page.readTime]) {
      if (typeof value === "string" && value.length >= 12) markers.add(value);
    }
    if (typeof page.htmlFile === "string") {
      const file = resolve(root, page.htmlFile);
      if (within(root, file) && existsSync(file)) {
        const html = readFileSync(file, "utf8");
        for (const fragment of html.replace(/<[^>]+>/g, " ").split(/[.!?]/)) {
          const normalized = fragment.replace(/\s+/g, " ").trim();
          if (normalized.length >= 24) markers.add(normalized);
        }
      }
    }
  }
  for (const media of manifest.media ?? []) {
    if (typeof media.file === "string") markers.add(basename(media.file));
  }
  for (const demo of manifest.demos ?? []) {
    markers.add(demo.title);
    markers.add(`demos/${demo.id}.html`);
    const file = resolve(root, demo.htmlFile);
    if (within(root, file) && existsSync(file)) {
      const html = readFileSync(file, "utf8");
      // Some original drawing primitives are already published as standalone
      // artwork. Match whole private documents, not shared CSS/engine lines.
      markers.add(html);
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      if (title && title.length >= 12) markers.add(`<title>${title}</title>`);
    }
  }
  for (const asset of manifest.demoAssets ?? []) {
    if (!/\.(?:js|css)$/.test(asset.file)) continue;
    markers.add(basename(asset.file));
    const file = resolve(root, asset.file);
    if (within(root, file) && existsSync(file)) markers.add(readFileSync(file, "utf8"));
  }
  return [...markers];
}

function scanFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...scanFiles(file));
    if (entry.isFile()) files.push(file);
  }
  return files;
}

export function assertPublicOutputExcludesPrivate(bundleManifest, bundleRoot, publicRoot = distRoot) {
  if (!existsSync(publicRoot)) return;
  const markers = privateMarkers(bundleManifest, bundleRoot);
  if (!markers.length) return;

  for (const file of scanFiles(publicRoot)) {
    const relativeFile = relative(publicRoot, file);
    const content = readFileSync(file).toString("utf8");
    if (markers.some((marker) => content.includes(marker) || relativeFile.includes(marker))) {
      throw new Error("Private bundle content appeared in public build output.");
    }
  }
}

function containsForbiddenSourceName(value) {
  return /(?:\.zip$|(?:^|[-_.])(archive|raw|source|transcript)(?:[-_.]|$))/i.test(value);
}

function mediaRecords(manifest, root, destination) {
  assert(Array.isArray(manifest.media), "The private source manifest needs a media allowlist.");
  const ids = new Set();

  return manifest.media.map((media) => {
    assert(media && idPattern.test(String(media.id ?? "")) && !ids.has(media.id), "Invalid private media id.");
    ids.add(media.id);
    const input = sourceFile(root, media.file, sourceMediaPattern, "private media");
    const extension = extname(input).toLowerCase();
    const contentType = allowedMediaTypes.get(extension);
    assert(contentType && media.contentType === contentType, "Invalid private media type.");
    assert(!containsForbiddenSourceName(media.file), "Private media allowlist cannot include source archives or transcripts.");
    const size = statSync(input).size;
    assert(size > 0 && size <= PRIVATE_WORK_MAX_MEDIA_BYTES, "Private media exceeds the 4.5 MB response budget.");

    const file = `media/${media.id}${extension === ".jpeg" ? ".jpg" : extension}`;
    copyFileSync(input, resolve(destination, file));
    return { id: media.id, file, contentType, size };
  });
}

function demoRecords(manifest, root, destination, media) {
  const mediaIds = new Set(media.map((item) => item.id));
  const ids = new Set();
  return (manifest.demos ?? []).map((demo) => {
    assert(demo && idPattern.test(String(demo.id ?? "")) && !ids.has(demo.id), "Invalid private demo id.");
    ids.add(demo.id);
    const input = sourceFile(root, demo.htmlFile, /^demos\/[A-Za-z0-9_-]+\.html$/, "private demo");
    const html = readFileSync(input, "utf8");
    assert(/^<!doctype html>/i.test(html) && Buffer.byteLength(html) <= PRIVATE_WORK_MAX_MEDIA_BYTES, "Invalid private demo document.");
    assert(!/<(?:iframe|object|embed|base)\b/i.test(html), "Private demos cannot embed other documents.");
    assert(!/\b(?:src|href)\s*=\s*["'](?:https?:|\/\/)/i.test(html) && !/@import\b/i.test(html), "Private demos must be self contained.");
    assert(mediaIds.has(demo.poster) && (!demo.before || mediaIds.has(demo.before)), "Private demo requires allowlisted images.");
    assert(Array.isArray(demo.scenarios) && demo.scenarios.length > 0 && demo.scenarios.length <= 40, "Invalid private demo scenarios.");
    const scenarios = demo.scenarios.map((scenario) => {
      assert(typeof scenario.query === "string" && /^[A-Za-z0-9_%=&,.-]*$/.test(scenario.query) && scenario.query.length <= 500, "Invalid private demo query.");
      return { label: shortText(scenario.label, "demo scenario", 160), query: scenario.query, note: shortText(scenario.note, "demo scenario note", 700) };
    });
    const htmlFile = `demos/${demo.id}.html`;
    writeFileSync(resolve(destination, htmlFile), html);
    assert(!demo.module || (idPattern.test(demo.module) && (manifest.demoAssets ?? []).some(asset => asset.id === demo.module && asset.contentType === "text/javascript; charset=utf-8")), "Private demo module must be allowlisted.");
    return { id: demo.id, module: demo.module || null, htmlFile, title: shortText(demo.title, "demo title", 160), caption: shortText(demo.caption, "demo caption", 1200), poster: demo.poster, before: demo.before || null, scenarios, size: Buffer.byteLength(html) };
  });
}

function demoAssetRecords(manifest, root, destination) {
  const types = new Map([[".woff2", "font/woff2"], [".js", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"]]);
  const ids = new Set();
  return (manifest.demoAssets ?? []).map((asset) => {
    assert(asset && idPattern.test(String(asset.id ?? "")) && !ids.has(asset.id), "Invalid private demo asset id.");
    ids.add(asset.id);
    const input = sourceFile(root, asset.file, /^demos\/assets\/[A-Za-z0-9_-]+\.(?:woff2|js|css)$/, "private demo asset");
    const contentType = types.get(extname(input));
    assert(contentType === asset.contentType, "Invalid private demo asset type.");
    const size = statSync(input).size;
    assert(size > 0 && size <= PRIVATE_WORK_MAX_MEDIA_BYTES, "Invalid private demo asset size.");
    const file = `demo-assets/${asset.id}${extname(input)}`;
    copyFileSync(input, resolve(destination, file));
    return { id: asset.id, file, contentType, size };
  });
}

function prepareHtml(html, mediaIds, demos = []) {
  assert(pageTextLength(html) >= 500, "Private page HTML must contain a substantial pre-rendered narrative.");
  assert(!/<\/?(?:script|style|iframe|object|embed|base)\b/i.test(html), "Private page HTML cannot include executable or embedded content.");
  assert(!/\son[a-z]+\s*=/i.test(html), "Private page HTML cannot include inline event handlers.");
  assert(!/\b(?:javascript:|file:|private-work-source\/)/i.test(html), "Private page HTML contains an unsafe URL.");

  let rendered = html.replace(/\{\{private-media:([A-Za-z0-9_-]+)\}\}/g, (match, id) => {
    assert(mediaIds.has(id), "Private page HTML references media outside the allowlist.");
    return `/private/media/${id}`;
  });

  // Validate authored media before expanding our own reviewed frame wrapper.
  assert(!/\b(?:src|poster)\s*=\s*["'](?!\/private\/media\/)/i.test(rendered), "Private page media must use an allowlisted placeholder.");
  rendered = rendered.replace(/\{\{private-demo:([A-Za-z0-9_-]+)\}\}/g, (_, id) => {
    const demo = demos.find((item) => item.id === id);
    assert(demo, "Private page HTML references a demo outside the allowlist.");
    return demoHtml(demo);
  });
  assert(!/\{\{[^}]+\}\}/.test(rendered), "Private page HTML contains an unsupported placeholder.");
  assert(!/\b(?:src|poster)\s*=\s*["'](?!\/private\/media\/)/i.test(rendered), "Private page media must use an allowlisted placeholder.");
  return rendered;
}

function pageRecords(manifest, root, destination, media, demos) {
  assert(Array.isArray(manifest.pages) && manifest.pages.length === 2, "The private source manifest must contain exactly two pages.");
  const slugs = new Set();
  const mediaIds = new Set(media.map((item) => item.id));

  return manifest.pages.map((page) => {
    assert(
      page && requiredPageSlugs.has(page.slug) && idPattern.test(String(page.slug ?? "")) && !slugs.has(page.slug),
      "Invalid private page slug."
    );
    slugs.add(page.slug);
    const htmlSource = sourceFile(root, page.htmlFile, sourcePagePattern, "private page HTML");
    const html = prepareHtml(readFileSync(htmlSource, "utf8"), mediaIds, demos);
    const htmlFile = `pages/${page.slug}.html`;
    writeFileSync(resolve(destination, htmlFile), html);
    return {
      slug: page.slug,
      title: shortText(page.title, "private page title", 240),
      summary: shortText(page.summary, "private page summary", 1_000),
      status: shortText(page.status, "private page status", 120),
      readTime: shortText(page.readTime, "private page read time", 120),
      htmlFile
    };
  });
}

function fixtureManifest(destination) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLq7wAAAABJRU5ErkJggg==",
    "base64"
  );
  const mp4 = Buffer.from(
    [
      "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAPEbW9vdgAAAGxtdmhkAAAAAAAAAAAA",
      "AAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA",
      "AABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAu50cmFrAAAAXHRraGQAAAADAAAA",
      "AAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAA",
      "AAAAAAAAAABAAAAAAUAAAAC0AAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAIAAABAAAA",
      "AAJmbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAMABVxAAAAAAALWhkbHIAAAAAAAAAAHZp",
      "ZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACEW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAA",
      "ACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAdFzdGJsAAAAwXN0c2QAAAAAAAAA",
      "AQAAALFhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAUAAtABIAAAASAAAAAAAAAABFUxhdmM2",
      "Mi4yOC4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAN2F2Y0MBZAAM/+EAGmdkAAys2UFBn58B",
      "EAAAAwAQAAADAYDxQplgAQAGaOvjyyLA/fj4AAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAA",
      "ABzYAAAAAAAAABhzdHRzAAAAAAAAAAEAAAAMAAAEAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAaGN0",
      "dHMAAAAAAAAACwAAAAEAAAgAAAAAAQAAFAAAAAABAAAIAAAAAAEAAAAAAAAAAQAABAAAAAABAAAU",
      "AAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABAAAAAAAgAABAAAAAAcc3RzYwAAAAAAAAAB",
      "AAAAAQAAAAwAAAABAAAARHN0c3oAAAAAAAAAAAAAAAwAAALyAAAAEQAAAA0AAAANAAAADQAAABYA",
      "AAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAAUc3RjbwAAAAAAAAABAAAD9AAAAGJ1ZHRhAAAAWm1l",
      "dGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAA",
      "AB1kYXRhAAAAAQAAAABMYXZmNjIuMTIuMTAxAAAACGZyZWUAAAOjbWRhdAAAAq4GBf//qtxF6b3m",
      "2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjUgcjMyMjIgYjM1NjA1YSAtIEguMjY0L01QRUctNCBB",
      "VkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjUgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94",
      "MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0w",
      "eDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9",
      "MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpv",
      "bmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz02IGxvb2th",
      "aGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNl",
      "ZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFt",
      "aWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2Vp",
      "Z2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0xMiBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNo",
      "PTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFw",
      "bWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAADxliIQA",
      "EP/+5sD5llogfd+1a0B1JXQLuueQ3pxAMuQ0PLnwACepTr3FxEIsVwtgIsAAAdENiArZTJZvGl0A",
      "AAANQZokbEEP/qpVAACFgAAAAAlBnkJ4hv8AAXcAAAAJAZ5hdEM/AAHHAAAACQGeY2pDPwABxwAA",
      "ABJBmmhJqEFomUwIf//+qZYAAgcAAAALQZ6GRREsN/8AAXcAAAAJAZ6ldEM/AAHHAAAACQGep2pD",
      "PwABxwAAABJBmqtJqEFsmUwIZ//+nhAAD5gAAAALQZ7JRRUsN/8AAXcAAAAJAZ7qakM/AAHH"
    ].join(""),
    "base64"
  );
  writeFileSync(resolve(destination, "media", "fixture-image.png"), png);
  writeFileSync(resolve(destination, "media", "fixture-video.mp4"), mp4);
  const body = `<figure><img src="{{private-media:fixture-image}}" alt="A neutral dummy image for access verification."></figure>
<h2 id="dummy-private-narrative">A dummy private narrative</h2>
<p>This fixture proves that the server gate returns pre-rendered private HTML only after a valid session is present. It contains neutral placeholder prose so the authentication path can be verified without exposing a real client, product, outcome, or unpublished visual.</p>
<p>The local browser check also requests a small media asset and a byte range. The production flow uses the same allowlist lookup, session validation, cache headers, and direct-handler protection before any page or media response is returned.</p>
<h2 id="access-boundary">The access boundary</h2>
<p>There is deliberately no claim here. This is only a bounded dummy document for the password gate and server-only bundle contract.</p>
<video controls preload="metadata"><source src="{{private-media:fixture-video}}" type="video/mp4"></video>`;
  writeFileSync(
    resolve(destination, "pages", "pave-unified-building.html"),
    prepareHtml(body, new Set(["fixture-image", "fixture-video"]))
  );
  writeFileSync(
    resolve(destination, "pages", "pave-redesign.html"),
    prepareHtml(body, new Set(["fixture-image", "fixture-video"]))
  );
  return {
    version: 1,
    availability: "ready",
    collection: { intro: "A dummy collection used only for local access verification." },
    pages: [
      {
        slug: "pave-unified-building",
        title: "Fixture study one",
        summary: "A neutral server-gated fixture.",
        status: "Dummy content",
        readTime: "1 min read",
        htmlFile: "pages/pave-unified-building.html"
      },
      {
        slug: "pave-redesign",
        title: "Fixture study two",
        summary: "A second neutral server-gated fixture.",
        status: "Dummy content",
        readTime: "1 min read",
        htmlFile: "pages/pave-redesign.html"
      }
    ],
    media: [
      { id: "fixture-image", file: "media/fixture-image.png", contentType: "image/png", size: png.length },
      { id: "fixture-video", file: "media/fixture-video.mp4", contentType: "video/mp4", size: mp4.length }
    ]
  };
}

function unavailableManifest() {
  return { version: 1, availability: "unavailable", pages: [], media: [], styles: [] };
}

function makeStagingDirectory(destination) {
  const staging = `${destination}.next-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(resolve(staging, "pages"), { recursive: true });
  mkdirSync(resolve(staging, "media"), { recursive: true });
  mkdirSync(resolve(staging, "demos"), { recursive: true });
  mkdirSync(resolve(staging, "demo-assets"), { recursive: true });
  return staging;
}

function replaceOutput(staging, destination) {
  rmSync(destination, { recursive: true, force: true });
  renameSync(staging, destination);
}

function updatePrebuiltStyles(destination, styles, shell) {
  const manifestFile = resolve(destination, sourceManifestName);
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  manifest.styles = styles;
  manifest.shell = shell;
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function sourceManifest(root) {
  const manifestFile = resolve(root, sourceManifestName);
  assert(existsSync(manifestFile), "Private source manifest is missing.");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  assert(manifest?.version === 1 && manifest.collection && typeof manifest.collection === "object", "Invalid private source manifest.");
  return manifest;
}

export function buildPrivateWork({
  inputRoot = sourceRoot,
  bundleRoot = outputRoot,
  publicRoot = distRoot,
  fixture = process.env.PRIVATE_WORK_FIXTURE === "1",
  prebuilt = process.env.PRIVATE_WORK_PREBUILT_BUNDLE === "1"
} = {}) {
  const styles = extractStyles(publicRoot);
  const shell = extractPrivateShell(publicRoot, { fixture });
  const inputAvailable = existsSync(resolve(inputRoot, sourceManifestName));

  if (!inputAvailable && prebuilt) {
    const bundle = readPrivateWorkBundle({ ...process.env, PRIVATE_WORK_BUNDLE_DIR: bundleRoot });
    assert(bundle.availability === "ready", "Prebuilt private bundle is missing or invalid.");
    const manifest = updatePrebuiltStyles(bundleRoot, styles, shell);
    assertPublicOutputExcludesPrivate(manifest, bundleRoot, publicRoot);
    removePublicTemplates(publicRoot);
    return { availability: "ready", mode: "prebuilt", bundleRoot };
  }

  const staging = makeStagingDirectory(bundleRoot);
  try {
    let manifest;
    if (fixture) {
      manifest = fixtureManifest(staging);
      manifest.styles = styles;
    } else if (!inputAvailable) {
      manifest = unavailableManifest();
    } else {
      const input = sourceManifest(inputRoot);
      const media = mediaRecords(input, inputRoot, staging);
      const demos = demoRecords(input, inputRoot, staging, media);
      const demoAssets = demoAssetRecords(input, inputRoot, staging);
      const pages = pageRecords(input, inputRoot, staging, media, demos);
      manifest = {
        version: 1,
        availability: "ready",
        styles,
        collection: { intro: typeof input.collection.intro === "string" ? input.collection.intro.trim() : "" },
        pages,
        demos,
        demoAssets,
        media
      };
    }

    manifest.shell = shell;
    writeFileSync(resolve(staging, sourceManifestName), `${JSON.stringify(manifest, null, 2)}\n`);
    if (manifest.availability === "ready") assertPublicOutputExcludesPrivate(manifest, staging, publicRoot);
    replaceOutput(staging, bundleRoot);
    removePublicTemplates(publicRoot);
    return { availability: manifest.availability, mode: fixture ? "fixture" : inputAvailable ? "source" : "unavailable", bundleRoot };
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = buildPrivateWork();
    process.stdout.write(`private-work bundle: ${result.mode} (${result.availability})\n`);
  } catch (error) {
    process.stderr.write(`private-work bundle failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
