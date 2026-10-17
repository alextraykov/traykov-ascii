// Captures one real screen per Labs tool for the Labs index cards.
// Usage: npm run build && node scripts/capture-labs-screens.mjs
// Writes public/labs/screens/<id>.webp at 960×720 (4:3), each at most 40 KB. Each crop is framed on
// the tool's own output with a sliver of its controls, so a small thumbnail still reads.
//
// The pages are served straight from dist/ through request interception, and every
// other host is blocked, so the capture is offline and repeatable.
// WebGL does not draw in headless Chromium, so the Playground's ASCII layer is filled
// with a real frame captured from a browser (scripts/fixtures/labs-playground-frame.txt).
// WebP is encoded by Chromium's own canvas, so no image tooling is needed.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const out = join(root, "public/labs/screens");
const { chromium } = createRequire(join(root, "package.json"))("playwright");

const WIDTH = 960;
const HEIGHT = 720;
const MAX_BYTES = 40_000;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".json": "application/json", ".glb": "model/gltf-binary",
  ".obj": "text/plain", ".mp4": "video/mp4", ".wasm": "application/wasm"
};

function playgroundFrame() {
  const body = readFileSync(join(root, "scripts/fixtures/labs-playground-frame.txt"), "utf8").replace(/\n$/, "").split("\n");
  const blank = " ".repeat(210);
  return [
    ...Array(25).fill(blank),
    ...body.map((line) => " ".repeat(69) + line.padEnd(141)),
    ...Array(Math.max(0, 116 - 25 - body.length)).fill(blank)
  ].join("\n");
}

// id, route, the element whose top-left anchors the 16:10 crop (or a fixed clip), optional setup.
const SHOTS = [
  {
    id: "playground",
    route: "/playground/",
    anchor: ".playground-stage",
    // The stage fills the window: frame the figure with the edge of the controls panel.
    clip: { x: 360, y: 150, width: 800 },
    setup: async (page) => {
      await page.evaluate((frame) => {
        const layer = [...document.querySelectorAll(".playground-stage pre")][1];
        if (!layer) return;
        layer.textContent = frame;
        layer.style.opacity = "1";
      }, playgroundFrame());
    }
  },
  {
    id: "svg-ascii-studio",
    route: "/svg-ascii-studio/",
    anchor: ".s2-stage",
    inset: { x: 0.16, width: 0.68 },
    setup: async (page) => {
      await page.locator("[data-load-sample]").first().click();
      await page.waitForTimeout(3000);
    }
  },
  { id: "ascii-banner", route: "/labs/ascii-banner/", anchor: ".ascii-banner-studio", inset: { x: 0, width: 0.5 } },
  { id: "presenting-in-code", route: "/labs/presenting-in-code/", anchor: ".pc-demo--hero", inset: { x: 0, width: 0.72 } }
];

async function encode(page, png) {
  return page.evaluate(
    async ({ src, width, height, maxBytes }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      for (let quality = 0.86; quality >= 0.1; quality -= 0.04) {
        const url = canvas.toDataURL("image/webp", quality);
        const bytes = Math.floor(((url.length - url.indexOf(",") - 1) * 3) / 4);
        if (bytes <= maxBytes) return { url, quality };
      }
      return { url: canvas.toDataURL("image/webp", 0.1), quality: 0.1 };
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, width: WIDTH, height: HEIGHT, maxBytes: MAX_BYTES }
  );
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "light", reducedMotion: "reduce" });
await context.addInitScript(() => {
  try {
    localStorage.setItem("traykov-color-theme", "light");
  } catch {}
});
await context.route("http://labs.local/**", (route) => {
  let file = join(dist, decodeURIComponent(new URL(route.request().url()).pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ path: file, contentType: TYPES[extname(file)] || "application/octet-stream" });
});
await context.route(/^https?:\/\/(?!labs\.local)/, (route) => route.abort());

const page = await context.newPage();
const encoder = await context.newPage();
await encoder.goto("http://labs.local/");
let failed = false;

for (const shot of SHOTS) {
  try {
    await page.goto(`http://labs.local${shot.route}`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(2500);
    if (shot.setup) await shot.setup(page);
    if (!shot.clip) await page.evaluate((selector) => {
      document.documentElement.style.scrollBehavior = "auto";
      const element = document.querySelector(selector);
      if (element) window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80);
    }, shot.anchor);
    await page.waitForTimeout(1200);
    const box = shot.clip || (await page.locator(shot.anchor).first().boundingBox());
    if (!box) throw new Error(`no ${shot.anchor}`);
    // Optional inset: a horizontal slice of the anchor (fractions of its width), kept at 4:3.
    const x = box.x + (shot.inset ? box.width * shot.inset.x : 0);
    const width = Math.min(shot.inset ? box.width * shot.inset.width : box.width, 1440 - x);
    const clip = { x, y: Math.max(0, box.y), width, height: (width * HEIGHT) / WIDTH };
    const png = await page.screenshot({ clip });
    const { url, quality } = await encode(encoder, png);
    const bytes = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
    writeFileSync(join(out, `${shot.id}.webp`), bytes);
    console.log(`${shot.id}.webp ${bytes.length} bytes, quality ${quality.toFixed(2)}`);
  } catch (error) {
    failed = true;
    console.error(`${shot.id}: ${error.message.split("\n")[0]}`);
  }
}

await browser.close();
if (failed) process.exit(1);
