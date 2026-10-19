// Captures one real screen per Labs tool for the Labs index cards.
// Usage: npm run build && node scripts/capture-labs-screens.mjs
// Writes public/labs/screens/<id>.webp at 960×720 (4:3), each at most 40 KB: the whole tool screen.
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

// Each screen is the whole tool as a visitor sees it: a 1280×1024 window, clipped to the 1280×960
// area under the site bar (4:3). Optional setup puts the tool in a representative state; `scrollTo`
// brings a part of the page to the top first.
const VIEW = { width: 1280, height: 1024 };
const CLIP = { x: 0, y: 64, width: 1280, height: 960 };
const SHOTS = [
  {
    id: "playground",
    route: "/playground/",
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
    setup: async (page) => {
      await page.locator("[data-load-sample]").first().click();
      await page.waitForTimeout(3000);
    }
  },
  { id: "ascii-banner", route: "/labs/ascii-banner/", scrollTo: ".labs-tool-workbench" },
  {
    id: "presenting-in-code",
    route: "/labs/presenting-in-code/",
    scrollTo: ".pc-layers",
    // The exploded "Lift" stage, the page's most distinctive view.
    setup: async (page) => {
      await page.locator(".pc-demo--layers").scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.locator('[data-pc-stage="3"]').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1800);
    }
  },
  { id: "glyph-kit", route: "/labs/glyph-kit/" }
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
const context = await browser.newContext({ viewport: VIEW, colorScheme: "light", reducedMotion: "reduce" });
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
    await page.evaluate((selector) => {
      document.documentElement.style.scrollBehavior = "auto";
      const element = selector && document.querySelector(selector);
      window.scrollTo(0, element ? element.getBoundingClientRect().top + window.scrollY - 64 - 24 : 0);
    }, shot.scrollTo || "");
    await page.waitForTimeout(1200);
    const clip = CLIP;
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
