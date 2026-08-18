import { chromium } from "@playwright/test";
import {
  AUDIT_ROUTE_SETS,
  BROWSER_VIEWPORTS,
  LOCAL_PREVIEW_RESOURCE_ALLOWLIST
} from "./browser-manifest.mjs";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const baseOrigin = new URL(baseUrl).origin;
const viewport = BROWSER_VIEWPORTS.find((entry) => entry.name === "desktop") || BROWSER_VIEWPORTS[0];

function localUrl(path) {
  return new URL(path, baseUrl).toString();
}

function relativeUrl(url) {
  const parsed = new URL(url);
  return parsed.origin === baseOrigin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
}

function isAllowedLocalPreviewResource(url) {
  const parsed = new URL(url);
  return parsed.origin === baseOrigin && LOCAL_PREVIEW_RESOURCE_ALLOWLIST.includes(parsed.pathname);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });
  const results = [];

  try {
    for (const route of AUDIT_ROUTE_SETS.performance) {
      const page = await context.newPage();
      const responses = [];
      const requestedUrl = localUrl(route.path);
      const result = { page: route.name, requestedUrl, finalUrl: "" };

      page.on("response", (response) => {
        const request = response.request();
        const url = response.url();
        if (new URL(url).origin !== baseOrigin) return;

        const headers = response.headers();
        responses.push({
          url,
          type: request.resourceType(),
          status: response.status(),
          contentLength: Number(headers["content-length"] || 0)
        });
      });

      try {
        const started = Date.now();
        const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded" });
        result.status = response?.status();
        await page.waitForTimeout(600);
        result.finalUrl = page.url();

        const perf = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const resources = performance.getEntriesByType("resource").map((entry) => ({
            name: entry.name,
            initiatorType: entry.initiatorType,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            duration: entry.duration
          }));

          return {
            domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
            loadEventEnd: Math.round(nav?.loadEventEnd || 0),
            resources
          };
        });

        const internalResources = perf.resources.filter((resource) => new URL(resource.name).origin === baseOrigin);
        const transferSize = internalResources.reduce((sum, resource) => sum + resource.transferSize, 0);
        const encodedBodySize = internalResources.reduce((sum, resource) => sum + resource.encodedBodySize, 0);
        const byType = internalResources.reduce((acc, resource) => {
          const key = resource.initiatorType || "other";
          acc[key] = (acc[key] || 0) + resource.encodedBodySize;
          return acc;
        }, {});

        Object.assign(result, {
          redirected: result.finalUrl !== requestedUrl,
          redirectDestination: relativeUrl(result.finalUrl),
          elapsedMs: Date.now() - started,
          domContentLoaded: perf.domContentLoaded,
          loadEventEnd: perf.loadEventEnd,
          requestCount: responses.length,
          encodedKb: Math.round(encodedBodySize / 1024),
          transferKb: Math.round(transferSize / 1024),
          byTypeKb: Object.fromEntries(
            Object.entries(byType).map(([key, value]) => [key, Math.round(value / 1024)])
          ),
          ignoredResponses: responses
            .filter((entry) => entry.status >= 400 && isAllowedLocalPreviewResource(entry.url))
            .map((entry) => ({ ...entry, url: relativeUrl(entry.url), reason: "Vercel Insights is deployment-provided." })),
          failedResponses: responses
            .filter((entry) => entry.status >= 400 && !isAllowedLocalPreviewResource(entry.url))
            .map((entry) => ({ ...entry, url: relativeUrl(entry.url) })),
          largest: internalResources
            .sort((a, b) => b.encodedBodySize - a.encodedBodySize)
            .slice(0, 8)
            .map((resource) => ({
              url: relativeUrl(resource.name),
              type: resource.initiatorType,
              kb: Math.round(resource.encodedBodySize / 1024),
              duration: Math.round(resource.duration)
            }))
        });
      } catch (error) {
        result.finalUrl = page.url();
        result.error = error instanceof Error ? error.message : String(error);
      } finally {
        await page.close();
      }

      results.push(result);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  // Thresholds remain advisory. Media-size limits continue to live in verify-site.
  console.log(JSON.stringify({ baseUrl, viewport: viewport.name, results }, null, 2));
}

await main();
