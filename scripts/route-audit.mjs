import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { chromium } from "@playwright/test";
import { BROWSER_VIEWPORTS, DECORATIVE_OVERFLOW_SELECTOR } from "./browser-manifest.mjs";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const baseOrigin = new URL(baseUrl).origin;
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

function localUrl(path) {
  return new URL(path, baseUrl).toString();
}

function relativeUrl(url) {
  const parsed = new URL(url);
  return parsed.origin === baseOrigin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error("dist/ does not exist. Run npm run build first.");
  }

  const routes = [...new Set(walk(distDir).map(routeFromFile))].sort();
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const route of routes) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const navigations = [];
      page.on("response", (response) => {
        const request = response.request();
        if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return;
        navigations.push({
          url: relativeUrl(response.url()),
          status: response.status(),
          location: response.headers().location
        });
      });

      for (const viewport of BROWSER_VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const requestedUrl = localUrl(route);
        const navigationStart = navigations.length;
        const result = {
          route,
          viewport: viewport.name,
          requestedUrl,
          finalUrl: "",
          status: undefined,
          redirect: undefined,
          horizontalOverflow: false,
          navWraps: false,
          overflowing: []
        };

        try {
          const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded" });
          result.status = response?.status();
          await page.waitForTimeout(350);
          result.finalUrl = page.url();

          const metrics = await page.evaluate((decorativeSelector) => {
            const nav = document.querySelector(".site-nav nav");
            const navRect = nav?.getBoundingClientRect();
            const navLinks = nav ? [...nav.querySelectorAll(":scope > a")].map((link) => link.getBoundingClientRect()) : [];
            const isDecorative = (element) =>
              Boolean(decorativeSelector) &&
              (element.matches(decorativeSelector) || Boolean(element.closest(decorativeSelector)));

            return {
              bodyWidth: document.documentElement.scrollWidth,
              viewportWidth: document.documentElement.clientWidth,
              navWraps: navLinks.some((rect) => navRect && rect.top > navRect.top + 6),
              overflowing: [...document.querySelectorAll("body *")]
                .filter((element) => {
                  const rect = element.getBoundingClientRect();
                  return rect.width > 0 && rect.right > window.innerWidth + 1 && !isDecorative(element);
                })
                .slice(0, 8)
                .map((element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    tag: element.tagName.toLowerCase(),
                    className: String(element.className || ""),
                    text: String(element.textContent || "").trim().slice(0, 80),
                    right: Math.round(rect.right)
                  };
                })
            };
          }, DECORATIVE_OVERFLOW_SELECTOR);

          result.horizontalOverflow = metrics.bodyWidth > metrics.viewportWidth + 1;
          result.navWraps = metrics.navWraps;
          result.overflowing = metrics.overflowing;
          const navigationChain = navigations.slice(navigationStart);
          result.redirect = {
            detected: result.finalUrl !== requestedUrl || navigationChain.some((entry) => entry.status >= 300 && entry.status < 400),
            destination: relativeUrl(result.finalUrl),
            navigationChain
          };
        } catch (error) {
          result.finalUrl = page.url();
          result.error = error instanceof Error ? error.message : String(error);
        }

        results.push(result);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // All route-level issues are advisory findings. A rejected script indicates an
  // infrastructure/runtime problem rather than a palette, redirect, or layout rule.
  console.log(JSON.stringify({ routeCount: routes.length, results }, null, 2));
}

await main();
