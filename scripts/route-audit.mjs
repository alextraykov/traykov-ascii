import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4330";
const distDir = "dist";

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

function routeFromFile(file) {
  const rel = relative(distDir, file);
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.replace(/\/index\.html$/, "/")}`;
  return `/${rel.replace(/\.html$/, "")}`;
}

function isMonochromeLike(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return true;
  const [r, g, b, a = "1"] = match[1].split(/,\s*|\s+/).filter(Boolean).map(Number);
  if (Number.isFinite(a) && a === 0) return true;
  if (![r, g, b].every(Number.isFinite)) return true;
  return Math.max(r, g, b) - Math.min(r, g, b) <= 10;
}

if (!existsSync(distDir)) {
  throw new Error("dist/ does not exist. Run npm run build first.");
}

const routes = [...new Set(walk(distDir).map(routeFromFile))].sort();
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

const browser = await chromium.launch();
const context = await browser.newContext();
const failures = [];
const results = [];

for (const route of routes) {
  const page = await context.newPage();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "load" });
    await page.waitForTimeout(250);

    const audit = await page.evaluate(() => {
      const sampled = [...document.querySelectorAll("body *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .slice(0, 400)
        .flatMap((element) => {
          const style = getComputedStyle(element);
          return [
            [element.tagName.toLowerCase(), "color", style.color],
            [element.tagName.toLowerCase(), "backgroundColor", style.backgroundColor],
            [element.tagName.toLowerCase(), "borderColor", style.borderColor]
          ];
        });

      const nav = document.querySelector(".site-nav nav");
      const navRect = nav?.getBoundingClientRect();
      const navLinks = nav ? [...nav.children].map((child) => child.getBoundingClientRect()) : [];

      return {
        title: document.title,
        bodyWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        navWraps: navLinks.some((rect) => navRect && rect.top > navRect.top + 6),
        overflowing: [...document.querySelectorAll("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.right > window.innerWidth + 1;
          })
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: String(element.className || ""),
            text: String(element.textContent || "").trim().slice(0, 80),
            right: Math.round(element.getBoundingClientRect().right)
          })),
        sampled
      };
    });

    const offPalette = audit.sampled.filter(([, property, color]) => {
      if (property === "backgroundColor" && color === "rgba(0, 0, 0, 0)") return false;
      return !isMonochromeLike(color);
    });

    const result = {
      route,
      viewport: viewport.name,
      status: response?.status(),
      horizontalOverflow: audit.bodyWidth > audit.viewportWidth + 1,
      navWraps: audit.navWraps,
      overflowing: audit.overflowing,
      offPalette: offPalette.slice(0, 6)
    };

    results.push(result);
    if (result.status !== 200 || result.horizontalOverflow || result.navWraps || result.offPalette.length) {
      failures.push(result);
    }
  }

  await page.close();
}

await browser.close();

console.log(JSON.stringify({ routeCount: routes.length, results, failures }, null, 2));

if (failures.length) process.exitCode = 1;
