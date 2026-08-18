import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import {
  AUDIT_ROUTE_SETS,
  BROWSER_VIEWPORTS,
  DECORATIVE_OVERFLOW_SELECTOR
} from "./browser-manifest.mjs";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const outDir = resolve("audit-artifacts/visual-audit");

function localUrl(path) {
  return new URL(path, baseUrl).toString();
}

function relativeUrl(url) {
  const parsed = new URL(url);
  const base = new URL(baseUrl);
  return parsed.origin === base.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  try {
    for (const viewport of BROWSER_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce"
      });

      for (const route of AUDIT_ROUTE_SETS.visual) {
        const page = await context.newPage();
        const requestedUrl = localUrl(route.path);
        const screenshot = resolve(outDir, `${route.name}-${viewport.name}.png`);
        const result = {
          page: route.name,
          viewport: viewport.name,
          requestedUrl,
          finalUrl: "",
          status: undefined,
          screenshot,
          horizontalOverflow: false,
          navWraps: false,
          overflowing: [],
          redirect: undefined
        };

        try {
          const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded" });
          result.status = response?.status();
          await page.waitForTimeout(350);
          result.finalUrl = page.url();
          result.redirect = {
            detected: result.finalUrl !== requestedUrl,
            destination: relativeUrl(result.finalUrl)
          };

          await page.screenshot({ path: screenshot, fullPage: true });
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
                .slice(0, 12)
                .map((element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    selector: element.className || element.tagName.toLowerCase(),
                    right: Math.round(rect.right),
                    viewport: window.innerWidth
                  };
                })
            };
          }, DECORATIVE_OVERFLOW_SELECTOR);

          result.horizontalOverflow = metrics.bodyWidth > metrics.viewportWidth + 1;
          result.navWraps = metrics.navWraps;
          result.overflowing = metrics.overflowing;
        } catch (error) {
          result.finalUrl = page.url();
          result.error = error instanceof Error ? error.message : String(error);
        } finally {
          await page.close();
        }

        results.push(result);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // This is a report-only diagnostic. Intentional case-study/lab color systems
  // and audit findings are returned in JSON; only runtime infrastructure errors
  // reject this script.
  console.log(JSON.stringify({ baseUrl, results }, null, 2));
}

await main();
