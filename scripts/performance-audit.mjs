import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";

const pages = [
  { name: "home", path: "/" },
  { name: "about", path: "/about/" },
  { name: "cases", path: "/case-studies/" },
  { name: "connection-central", path: "/case-studies/connection-central/" },
  { name: "pave-case", path: "/case-studies/designing-pave/" }
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1
});

const results = [];

for (const route of pages) {
  const page = await context.newPage();
  const responses = [];

  page.on("response", async (response) => {
    const request = response.request();
    const url = response.url();
    if (!url.startsWith(baseUrl)) return;

    const headers = response.headers();
    const contentLength = Number(headers["content-length"] || 0);
    responses.push({
      url,
      type: request.resourceType(),
      status: response.status(),
      contentLength
    });
  });

  const started = Date.now();
  await page.goto(new URL(route.path, baseUrl).toString(), { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

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
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadEventEnd: Math.round(nav.loadEventEnd),
      resources
    };
  });

  const internalResources = perf.resources.filter((resource) => resource.name.startsWith(baseUrl));
  const transferSize = internalResources.reduce((sum, resource) => sum + resource.transferSize, 0);
  const encodedBodySize = internalResources.reduce((sum, resource) => sum + resource.encodedBodySize, 0);
  const byType = internalResources.reduce((acc, resource) => {
    const key = resource.initiatorType || "other";
    acc[key] = (acc[key] || 0) + resource.encodedBodySize;
    return acc;
  }, {});

  const largest = internalResources
    .sort((a, b) => b.encodedBodySize - a.encodedBodySize)
    .slice(0, 8)
    .map((resource) => ({
      url: resource.name.replace(baseUrl, ""),
      type: resource.initiatorType,
      kb: Math.round(resource.encodedBodySize / 1024),
      duration: Math.round(resource.duration)
    }));

  results.push({
    page: route.name,
    elapsedMs: Date.now() - started,
    domContentLoaded: perf.domContentLoaded,
    loadEventEnd: perf.loadEventEnd,
    requestCount: responses.length,
    encodedKb: Math.round(encodedBodySize / 1024),
    transferKb: Math.round(transferSize / 1024),
    byTypeKb: Object.fromEntries(Object.entries(byType).map(([key, value]) => [key, Math.round(value / 1024)])),
    largest
  });

  await page.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
