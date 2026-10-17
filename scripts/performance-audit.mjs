import { chromium } from "@playwright/test";
import {
  AUDIT_ROUTE_SETS,
  BROWSER_VIEWPORTS,
  LOCAL_PREVIEW_RESOURCE_ALLOWLIST
} from "./browser-manifest.mjs";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const baseOrigin = new URL(baseUrl).origin;
const sampleDelayMs = 2_000;
const performanceProfile = Object.freeze({
  label: "cold-local-lab",
  freshContextPerRouteViewport: true,
  sampleDelayAfterDomContentLoadedMs: sampleDelayMs,
  advisory: true,
  limitations: [
    "Local preview measurements are not production network or CDN measurements.",
    "This sample does not measure field INP or CrUX data.",
    "No real-device CPU, radio, memory, or assistive-technology evidence is implied."
  ]
});

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

function isLocalResource(url) {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

function round(value, digits = 0) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function bytesToKb(value) {
  return Math.round(value / 1024);
}

function installMetricObservers() {
  const key = "__portfolioPerformanceAudit";
  if (window[key]) return;

  const metrics = {
    observerSupport: {},
    largestContentfulPaint: [],
    layoutShifts: [],
    longTasks: []
  };
  window[key] = metrics;

  const describeElement = (element) => {
    if (!(element instanceof Element)) return "";
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const className = element.classList.length
      ? `.${[...element.classList].slice(0, 2).join(".")}`
      : "";
    return `${tag}${id}${className}`;
  };

  const observe = (type, receive) => {
    try {
      const observer = new PerformanceObserver((list) => receive(list.getEntries()));
      observer.observe({ type, buffered: true });
      metrics.observerSupport[type] = true;
    } catch {
      metrics.observerSupport[type] = false;
    }
  };

  observe("largest-contentful-paint", (entries) => {
    for (const entry of entries) {
      metrics.largestContentfulPaint.push({
        startTime: entry.startTime,
        renderTime: entry.renderTime,
        loadTime: entry.loadTime,
        size: entry.size,
        url: entry.url || "",
        element: describeElement(entry.element)
      });
    }
  });

  observe("layout-shift", (entries) => {
    for (const entry of entries) {
      metrics.layoutShifts.push({
        startTime: entry.startTime,
        value: entry.value,
        hadRecentInput: Boolean(entry.hadRecentInput),
        sourceCount: entry.sources?.length || 0
      });
    }
  });

  observe("longtask", (entries) => {
    for (const entry of entries) {
      metrics.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
        name: entry.name || "unknown"
      });
    }
  });
}

function summarizeLargestContentfulPaint(entries, supported) {
  const latest = entries.at(-1);
  return {
    supported: Boolean(supported),
    entryCount: entries.length,
    valueMs: latest ? round(latest.startTime) : null,
    renderTimeMs: latest ? round(latest.renderTime) : null,
    loadTimeMs: latest ? round(latest.loadTime) : null,
    size: latest ? latest.size : null,
    url: latest?.url ? relativeUrl(latest.url) : "",
    element: latest?.element || ""
  };
}

function summarizeCumulativeLayoutShift(entries, supported) {
  const eligible = entries
    .filter((entry) => !entry.hadRecentInput)
    .sort((left, right) => left.startTime - right.startTime);
  let currentWindow;
  let maximumWindow;

  for (const entry of eligible) {
    const continuesWindow =
      currentWindow &&
      entry.startTime - currentWindow.lastEntryMs <= 1_000 &&
      entry.startTime - currentWindow.startMs <= 5_000;

    if (continuesWindow) {
      currentWindow.value += entry.value;
      currentWindow.lastEntryMs = entry.startTime;
      currentWindow.entries += 1;
    } else {
      currentWindow = {
        value: entry.value,
        startMs: entry.startTime,
        lastEntryMs: entry.startTime,
        entries: 1
      };
    }

    if (!maximumWindow || currentWindow.value > maximumWindow.value) {
      maximumWindow = { ...currentWindow };
    }
  }

  return {
    supported: Boolean(supported),
    eligibleShiftCount: eligible.length,
    ignoredRecentInputShiftCount: entries.length - eligible.length,
    totalEligibleValue: round(eligible.reduce((sum, entry) => sum + entry.value, 0), 4),
    sessionWindowValue: round(maximumWindow?.value || 0, 4),
    sessionWindowStartMs: maximumWindow ? round(maximumWindow.startMs) : null,
    sessionWindowEndMs: maximumWindow ? round(maximumWindow.lastEntryMs) : null,
    sessionWindowEntryCount: maximumWindow?.entries || 0
  };
}

function summarizeLongTasks(entries, supported) {
  const durations = entries.map((entry) => entry.duration);
  return {
    supported: Boolean(supported),
    count: entries.length,
    totalMs: round(durations.reduce((sum, duration) => sum + duration, 0)),
    maxMs: durations.length ? round(Math.max(...durations)) : 0
  };
}

function summarizeResources(resources) {
  const internalResources = resources.filter((resource) => isLocalResource(resource.name));
  const encodedBytes = internalResources.reduce((sum, resource) => sum + resource.encodedBodySize, 0);
  const transferBytes = internalResources.reduce((sum, resource) => sum + resource.transferSize, 0);
  const byType = new Map();

  for (const resource of internalResources) {
    const type = resource.initiatorType || "other";
    const current = byType.get(type) || { resources: 0, encodedBytes: 0, transferBytes: 0 };
    current.resources += 1;
    current.encodedBytes += resource.encodedBodySize;
    current.transferBytes += resource.transferSize;
    byType.set(type, current);
  }

  const resourceTypes = Object.fromEntries(
    [...byType.entries()].map(([type, totals]) => [
      type,
      {
        resources: totals.resources,
        encodedKb: bytesToKb(totals.encodedBytes),
        transferKb: bytesToKb(totals.transferBytes)
      }
    ])
  );

  return {
    resourceCount: internalResources.length,
    encodedKb: bytesToKb(encodedBytes),
    transferKb: bytesToKb(transferBytes),
    byTypeKb: Object.fromEntries(
      [...byType.entries()].map(([type, totals]) => [type, bytesToKb(totals.encodedBytes)])
    ),
    resourceTypes,
    largest: internalResources
      .toSorted(
        (left, right) =>
          Math.max(right.encodedBodySize, right.transferSize) -
          Math.max(left.encodedBodySize, left.transferSize)
      )
      .slice(0, 8)
      .map((resource) => ({
        url: relativeUrl(resource.name),
        type: resource.initiatorType,
        // Keep the former compact field for people comparing previous audit output.
        kb: bytesToKb(resource.encodedBodySize),
        encodedKb: bytesToKb(resource.encodedBodySize),
        transferKb: bytesToKb(resource.transferSize),
        duration: round(resource.duration)
      }))
  };
}

async function auditRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: Boolean(viewport.hasTouch)
  });
  const page = await context.newPage();
  const responses = [];
  const requestedUrl = localUrl(route.path);
  const result = {
    page: route.name,
    viewport: {
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      hasTouch: Boolean(viewport.hasTouch)
    },
    profile: performanceProfile.label,
    requestedUrl,
    finalUrl: ""
  };

  page.on("response", (response) => {
    const request = response.request();
    const url = response.url();
    if (!isLocalResource(url)) return;

    const headers = response.headers();
    responses.push({
      url,
      type: request.resourceType(),
      status: response.status(),
      contentLength: Number(headers["content-length"] || 0)
    });
  });

  try {
    await page.addInitScript(installMetricObservers);
    const started = Date.now();
    const response = await page.goto(requestedUrl, { waitUntil: "domcontentloaded" });
    result.status = response?.status();
    await page.waitForTimeout(sampleDelayMs);
    result.finalUrl = page.url();

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const metrics = window.__portfolioPerformanceAudit || {
        observerSupport: {},
        largestContentfulPaint: [],
        layoutShifts: [],
        longTasks: []
      };
      const resources = performance.getEntriesByType("resource").map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        duration: entry.duration
      }));

      return {
        sampledAtMs: performance.now(),
        domContentLoaded: nav?.domContentLoadedEventEnd || 0,
        loadEventEnd: nav?.loadEventEnd || 0,
        resources,
        metrics
      };
    });
    const resources = summarizeResources(perf.resources);

    Object.assign(result, {
      redirected: result.finalUrl !== requestedUrl,
      redirectDestination: relativeUrl(result.finalUrl),
      elapsedMs: Date.now() - started,
      sampleDelayAfterDomContentLoadedMs: sampleDelayMs,
      sampledAtMs: round(perf.sampledAtMs),
      domContentLoaded: round(perf.domContentLoaded),
      loadEventEnd: round(perf.loadEventEnd),
      requestCount: responses.length,
      ...resources,
      lcp: summarizeLargestContentfulPaint(
        perf.metrics.largestContentfulPaint,
        perf.metrics.observerSupport["largest-contentful-paint"]
      ),
      cls: summarizeCumulativeLayoutShift(
        perf.metrics.layoutShifts,
        perf.metrics.observerSupport["layout-shift"]
      ),
      longTasks: summarizeLongTasks(perf.metrics.longTasks, perf.metrics.observerSupport.longtask),
      ignoredResponses: responses
        .filter((entry) => entry.status >= 400 && isAllowedLocalPreviewResource(entry.url))
        .map((entry) => ({
          ...entry,
          url: relativeUrl(entry.url),
          reason: "Vercel Insights is deployment-provided."
        })),
      failedResponses: responses
        .filter((entry) => entry.status >= 400 && !isAllowedLocalPreviewResource(entry.url))
        .map((entry) => ({ ...entry, url: relativeUrl(entry.url) }))
    });
  } catch (error) {
    result.finalUrl = page.url();
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await context.close();
  }

  return result;
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const viewport of BROWSER_VIEWPORTS) {
      for (const route of AUDIT_ROUTE_SETS.performance) {
        results.push(await auditRoute(browser, route, viewport));
      }
    }
  } finally {
    await browser.close();
  }

  // Thresholds remain advisory. Media-size limits continue to live in verify-site.
  console.log(
    JSON.stringify(
      {
        baseUrl,
        advisory: true,
        profile: performanceProfile,
        viewports: BROWSER_VIEWPORTS,
        results
      },
      null,
      2
    )
  );
}

await main();
