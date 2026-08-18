import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import {
  BROWSER_VIEWPORTS,
  HARD_BROWSER_ROUTES,
  LOCAL_PREVIEW_RESOURCE_ALLOWLIST
} from "./browser-manifest.mjs";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const baseOrigin = new URL(baseUrl).origin;
const artifactRoot = resolve("audit-artifacts/browser-contract");
const syntheticFailure = process.env.BROWSER_CONTRACT_SYNTHETIC_FAILURE === "1";
const syntheticUnexpectedRedirect = process.env.BROWSER_CONTRACT_SYNTHETIC_UNEXPECTED_REDIRECT === "1";
const browserRoutes = Object.freeze([
  ...HARD_BROWSER_ROUTES,
  {
    name: "contact",
    path: "/contact/",
    requiredSelectors: ["#contact-title", ".contact-call"]
  },
  {
    name: "cemetery-loop",
    path: "/notes/the-cemetery-loop/",
    requiredSelectors: [".note-header h1", "[data-web-cemetery]", ".note-body"]
  }
]);
const modes = [
  { name: "normal", context: { javaScriptEnabled: true, reducedMotion: "no-preference" } },
  { name: "no-js", context: { javaScriptEnabled: false, reducedMotion: "no-preference" } },
  { name: "reduced-motion", context: { javaScriptEnabled: true, reducedMotion: "reduce" } }
];
const sketchbookNoJsRoute = Object.freeze({
  name: "sketchbook-no-js",
  path: "/labs/sketchbook/",
  requiredSelectors: ["main h1", "[data-sketch-static-fallback]", ".creative-sketchbook__noscript"]
});

function localUrl(path) {
  return new URL(path, baseUrl).toString();
}

function isSameOrigin(url) {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

function relativeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === baseOrigin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return url;
  }
}

function isAllowedLocalPreviewResource(url) {
  try {
    return new URL(url).origin === baseOrigin && LOCAL_PREVIEW_RESOURCE_ALLOWLIST.includes(new URL(url).pathname);
  } catch {
    return false;
  }
}

function expectedUrlMatches(url, expected) {
  const parsed = new URL(url);
  return (
    parsed.origin === baseOrigin &&
    parsed.pathname === expected.pathname &&
    (expected.hash === undefined || parsed.hash === expected.hash)
  );
}

function sameOriginPathMatches(actualUrl, expectedUrl) {
  const actual = new URL(actualUrl);
  const expected = new URL(expectedUrl);
  return actual.origin === expected.origin && actual.pathname === expected.pathname;
}

function isAllowedLocalPreviewConsoleError(entry) {
  return (
    entry.type === "error" &&
    isAllowedLocalPreviewResource(entry.location?.url) &&
    /^Failed to load resource: the server responded with a status of 404\b/.test(entry.text)
  );
}

function isExpectedCemeteryFallbackConsoleError(route, entry) {
  return (
    route.name === "cemetery-loop" &&
    entry.type === "error" &&
    (entry.text.startsWith("THREE.WebGLRenderer: A WebGL context could not be created. Reason:") ||
      entry.text === "THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.")
  );
}

function addFailure(result, assertion, message, detail) {
  result.failures.push({ assertion, message, ...(detail === undefined ? {} : { detail }) });
}

async function assertBookingPath(result, page, mode, route) {
  const selector =
    route.name === "contact"
      ? "#book-a-call[data-booking-modal-open]"
      : route.name === "synapse-sys"
        ? ".case-contact-prompt__actions a[data-booking-modal-open]"
        : undefined;
  if (!selector) return;

  const link = page.locator(selector);
  const count = await link.count();
  if (count !== 1) {
    addFailure(result, "booking-link-fallback", "Booking action is not a unique enhanced link.", { selector, count });
    return;
  }

  const state = await link.evaluate((element) => {
    const href = element instanceof HTMLAnchorElement ? element.href : "";
    let isCalBooking = false;
    try {
      const url = new URL(href);
      isCalBooking = url.hostname === "cal.com" && url.pathname.split("/").filter(Boolean).length >= 2;
    } catch {
      // The assertion below reports an unusable href.
    }
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      hrefAttribute: element.getAttribute("href"),
      href,
      isCalBooking
    };
  });
  const dialog = page.locator("[data-footer-booking-modal]");
  const dialogCount = await dialog.count();
  result.booking = { selector, ...state, dialogCount };

  if (state.tagName !== "a" || !/^https?:\/\//.test(state.href)) {
    addFailure(result, "booking-link-fallback", "Booking action does not expose a usable HTTP(S) href.", state);
  }
  if (route.name === "contact" && state.id !== "book-a-call") {
    addFailure(result, "booking-contact-anchor", "Contact booking link lost the #book-a-call anchor.", state);
  }
  if (state.isCalBooking ? dialogCount !== 1 : dialogCount !== 0) {
    addFailure(
      result,
      "booking-dialog-eligibility",
      "Booking dialog presence does not match the resolved booking provider.",
      result.booking
    );
  }

  if (mode.name === "no-js" || !state.isCalBooking || dialogCount !== 1) return;

  await link.scrollIntoViewIfNeeded();
  await link.click();
  const opened = await dialog.evaluate((element) => element instanceof HTMLDialogElement && element.open);
  if (!opened) {
    addFailure(result, "booking-dialog-enhancement", "Cal.com booking link did not open the footer dialog.");
    return;
  }

  await dialog.locator("[data-footer-booking-close]").click();
  const focusRestored = await link.evaluate((element) => document.activeElement === element);
  result.booking.opened = opened;
  result.booking.focusRestored = focusRestored;
  if (!focusRestored) {
    addFailure(result, "booking-focus-restoration", "Closing the booking dialog did not restore trigger focus.");
  }
}

async function assertSketchbookNoJsFallback(result, page, mode, route) {
  if (route.name !== sketchbookNoJsRoute.name || mode.name !== "no-js") return;

  result.sketchbookNoJs = await page.evaluate(() => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0.01
      );
    };

    const root = document.querySelector("[data-creative-sketchbook]");
    const fallback = document.querySelector("[data-sketch-static-fallback]");
    const explanation = document.querySelector(".creative-sketchbook__noscript");
    const visibleInteractiveControls = [...document.querySelectorAll("[data-sketch-interactive]")].filter(isVisible).length;

    return {
      enhanced: root instanceof HTMLElement ? root.dataset.sketchbookEnhanced || "" : "",
      fallback: {
        visible: isVisible(fallback),
        text: (fallback?.textContent || "").replace(/\s+/g, " ").trim()
      },
      explanation: {
        visible: isVisible(explanation),
        text: (explanation?.textContent || "").replace(/\s+/g, " ").trim()
      },
      visibleInteractiveControls
    };
  });

  const state = result.sketchbookNoJs;
  if (state.enhanced) {
    addFailure(result, "sketchbook-no-js-enhancement", "Sketchbook marked itself enhanced without JavaScript.", state);
  }
  if (!state.fallback.visible || !state.fallback.text.includes("DITHER ORBIT")) {
    addFailure(result, "sketchbook-no-js-fallback", "Sketchbook static first-sketch fallback was not readable.", state);
  }
  if (!state.explanation.visible || !state.explanation.text.includes("JavaScript activates")) {
    addFailure(result, "sketchbook-no-js-explanation", "Sketchbook no-JavaScript explanation was not readable.", state);
  }
  if (state.visibleInteractiveControls) {
    addFailure(
      result,
      "sketchbook-no-js-interactive-controls",
      "Sketchbook exposed interactive-only controls without JavaScript.",
      state
    );
  }
}

async function collectPrimaryContent(page, selectors) {
  const checks = [];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await page.locator(selector).count();
    if (count === 0) {
      checks.push({ selector, count, visible: false, readable: false });
      continue;
    }

    // Some required copy intentionally reveals only once it enters the viewport.
    // Evaluate its settled route state, while still checking every ancestor after
    // the reveal has had time to complete.
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(550);

    const detail = await locator.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      const ancestorChain = [];
      let hiddenBy;
      let current = element;

      while (current) {
        const ancestorStyle = getComputedStyle(current);
        const entry = {
          tag: current.tagName.toLowerCase(),
          id: current.id || "",
          className: String(current.className || ""),
          display: ancestorStyle.display,
          visibility: ancestorStyle.visibility,
          opacity: Number.parseFloat(ancestorStyle.opacity || "1"),
          hidden: current instanceof HTMLElement && current.hidden
        };
        ancestorChain.push(entry);

        if (
          !hiddenBy &&
          (entry.hidden ||
            entry.display === "none" ||
            entry.visibility === "hidden" ||
            entry.opacity <= 0.01)
        ) {
          hiddenBy = entry;
        }
        current = current.parentElement;
      }

      const visible = !hiddenBy && rect.width > 0 && rect.height > 0;
      return {
        visible,
        readable: text.length > 0,
        text: text.slice(0, 180),
        rect: { width: rect.width, height: rect.height },
        ancestorChain,
        ...(hiddenBy ? { hiddenBy } : {})
      };
    });
    checks.push({ selector, count, ...detail });
  }
  return checks;
}

async function collectLayoutMetrics(page) {
  return page.evaluate(() => {
    const nav = document.querySelector(".site-nav nav");
    const navRect = nav?.getBoundingClientRect();
    const navLinks = nav
      ? [...nav.querySelectorAll(":scope > a")].map((link) => {
          const rect = link.getBoundingClientRect();
          return { text: (link.textContent || "").trim(), top: rect.top, bottom: rect.bottom };
        })
      : [];
    const navWraps = navLinks.some((link) => navRect && link.top > navRect.top + 6);

    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      navWraps,
      navLinks
    };
  });
}

async function collectReducedMotionState(page) {
  await page.evaluate(async () => {
    window.scrollTo({ top: Math.max(1, document.documentElement.scrollHeight), behavior: "auto" });
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });

  return page.evaluate(() => {
    const durationToMs = (value) => {
      if (!value) return 0;
      return value.split(",").reduce((largest, duration) => {
        const trimmed = duration.trim();
        const ms = trimmed.endsWith("ms")
          ? Number.parseFloat(trimmed)
          : trimmed.endsWith("s")
            ? Number.parseFloat(trimmed) * 1_000
            : 0;
        return Number.isFinite(ms) ? Math.max(largest, ms) : largest;
      }, 0);
    };
    const reveal = [...document.querySelectorAll("[data-reveal]")].map((element) => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || ""),
        state: element.dataset.revealState || "",
        hidden: element.hidden,
        opacity: Number.parseFloat(style.opacity || "1"),
        visibility: style.visibility,
        transitionMs: durationToMs(style.transitionDuration),
        animationMs: durationToMs(style.animationDuration)
      };
    });
    const root = document.documentElement;
    const turntable = document.querySelector(".about-turntable");
    const trail = document.querySelector(".dither-trail");
    const aboutHero = document.querySelector(".about-hero--trail");
    const customProperty = (element, property) => (element ? element.style.getPropertyValue(property).trim() : "");

    return {
      reveal,
      parallax: {
        heroExit: customProperty(root, "--hero-exit"),
        homeTurntable: customProperty(turntable, "--about-turntable-parallax"),
        trail: customProperty(trail, "--trail-parallax-y"),
        aboutHero: customProperty(aboutHero, "--about-hero-parallax-y")
      }
    };
  });
}

function isRestValue(value) {
  if (!value) return true;
  return /^[-+]?0(?:\.0+)?(?:px|%|deg|s|ms)?$/i.test(value.trim());
}

function assertReducedMotion(result, state) {
  // A few responsive controls are intentionally visually suppressed on small
  // screens. The reveal contract is that content reaches its in/rest state;
  // primary-content assertions separately ensure the readable page is visible.
  const hiddenReveal = state.reveal.filter((item) => item.state !== "in" || item.hidden || item.opacity < 0.99);
  if (hiddenReveal.length) {
    addFailure(result, "reduced-motion-reveals", "Reduced-motion reveal content was not exposed at rest.", hiddenReveal);
  }

  // The site's reduced-motion stylesheet normalizes transition/animation durations
  // to 1ms, which is a rest-state equivalent rather than active motion.
  const activeMotion = state.reveal.filter((item) => item.transitionMs > 1 || item.animationMs > 1);
  if (activeMotion.length) {
    addFailure(result, "reduced-motion-duration", "Reduced-motion reveal content retained active motion timing.", activeMotion);
  }

  const movingParallax = Object.entries(state.parallax).filter(([, value]) => !isRestValue(value));
  if (movingParallax.length) {
    addFailure(
      result,
      "reduced-motion-parallax",
      "Reduced-motion page retained an active scroll/parallax custom property.",
      Object.fromEntries(movingParallax)
    );
  }
}

function writeFailureArtifact(result) {
  const fileBase = `${result.route.name}-${result.viewport.name}`;
  const directory = resolve(artifactRoot, result.mode);
  const jsonPath = resolve(directory, `${fileBase}.json`);
  const screenshotPath = resolve(directory, `${fileBase}.png`);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify({ ...result, screenshot: screenshotPath }, null, 2)}\n`);
  return { jsonPath, screenshotPath };
}

async function runCase(browser, mode, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    ...mode.context
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);

  const result = {
    route: { name: route.name, path: route.path },
    viewport,
    mode: mode.name,
    requestedUrl: localUrl(route.path),
    finalUrl: "",
    status: undefined,
    primaryContent: [],
    layout: undefined,
    pageErrors: [],
    ignoredPageErrors: [],
    console: [],
    ignoredConsole: [],
    ignoredResources: [],
    abortedResources: [],
    failedResources: [],
    failedResponses: [],
    failures: []
  };

  page.on("pageerror", (error) => {
    // Chromium reports a rejected ViewTransition.finished promise when the
    // required meta-refresh redirect replaces the transient page. The redirect
    // itself is asserted below; retain the event as evidence without treating
    // this browser navigation artifact as an application crash.
    if (route.expectedFinal && error.message === "Transition was skipped") {
      result.ignoredPageErrors.push({ message: error.message, reason: "Expected meta-refresh redirect." });
    } else {
      result.pageErrors.push(error.message);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      const entry = { type: message.type(), text: message.text(), location: message.location() };
      if (isAllowedLocalPreviewConsoleError(entry)) {
        result.ignoredConsole.push({ ...entry, reason: "Vercel Insights is deployment-provided." });
      } else if (isExpectedCemeteryFallbackConsoleError(route, entry)) {
        result.ignoredConsole.push({
          ...entry,
          reason: "Cemetery poster fallback is expected when headless WebGL context creation fails."
        });
      } else {
        result.console.push(entry);
      }
    }
  });
  page.on("requestfailed", (request) => {
    if (!isSameOrigin(request.url())) return;
    const resource = {
      url: relativeUrl(request.url()),
      type: request.resourceType(),
      error: request.failure()?.errorText || "request failed"
    };
    if (isAllowedLocalPreviewResource(request.url())) {
      result.ignoredResources.push({ ...resource, reason: "Vercel Insights is deployment-provided." });
    } else if (resource.error === "net::ERR_ABORTED") {
      // Browsers routinely cancel speculative media loads and Playwright also
      // emits this as a page/context closes. It is not a failed response.
      result.abortedResources.push(resource);
    } else {
      result.failedResources.push(resource);
    }
  });
  page.on("response", (response) => {
    if (!isSameOrigin(response.url()) || response.status() < 400) return;
    const resource = {
      url: relativeUrl(response.url()),
      type: response.request().resourceType(),
      status: response.status()
    };
    if (isAllowedLocalPreviewResource(response.url())) {
      result.ignoredResources.push({ ...resource, reason: "Vercel Insights is deployment-provided." });
    } else {
      result.failedResponses.push(resource);
    }
  });

  try {
    const response = await page.goto(result.requestedUrl, { waitUntil: "domcontentloaded" });
    result.status = response?.status();

    if (route.expectedFinal) {
      await page.waitForFunction(
        (expected) => window.location.pathname === expected.pathname && window.location.hash === expected.hash,
        route.expectedFinal,
        { timeout: 10_000 }
      );
    }

    await page.waitForTimeout(350);
    result.finalUrl = page.url();

    if (typeof result.status !== "number" || result.status >= 400) {
      addFailure(result, "navigation-status", "Navigation did not return a successful response.", result.status);
    }
    if (route.expectedFinal && !expectedUrlMatches(result.finalUrl, route.expectedFinal)) {
      addFailure(result, "expected-redirect", "Route did not reach its expected redirect destination.", {
        expected: route.expectedFinal,
        actual: relativeUrl(result.finalUrl)
      });
    }
    if (!route.expectedFinal) {
      const assertedFinalUrl =
        syntheticUnexpectedRedirect && mode.name === "normal" && route.name === "home" && viewport.name === "desktop"
          ? localUrl("/about/")
          : result.finalUrl;
      if (!sameOriginPathMatches(assertedFinalUrl, result.requestedUrl)) {
        addFailure(result, "unexpected-final-url", "Canonical route ended at an unexpected origin or path.", {
          expected: relativeUrl(result.requestedUrl),
          actual: relativeUrl(assertedFinalUrl),
          documentUrl: relativeUrl(result.finalUrl),
          ...(assertedFinalUrl !== result.finalUrl ? { synthetic: true } : {})
        });
      }
    }

    result.primaryContent = await collectPrimaryContent(page, route.requiredSelectors);
    for (const content of result.primaryContent) {
      if (!content.visible || !content.readable) {
        addFailure(result, "primary-content", `Primary content is not visible and readable: ${content.selector}`, content);
      }
    }

    result.layout = await collectLayoutMetrics(page);
    if (result.layout.documentScrollWidth > result.layout.documentClientWidth + 1) {
      addFailure(result, "document-horizontal-overflow", "Document has horizontal overflow.", result.layout);
    }
    if (result.layout.navWraps) {
      addFailure(result, "navigation-wrap", "Primary navigation wrapped onto more than one row.", result.layout.navLinks);
    }
    if (result.pageErrors.length) {
      addFailure(result, "uncaught-page-errors", "Page emitted uncaught errors.", result.pageErrors);
    }
    const consoleErrors = result.console.filter((entry) => entry.type === "error");
    if (consoleErrors.length) {
      addFailure(result, "console-errors", "Page emitted console.error output.", consoleErrors);
    }
    if (result.failedResources.length) {
      addFailure(result, "same-origin-resource-failure", "A same-origin resource request failed.", result.failedResources);
    }
    if (result.failedResponses.length) {
      addFailure(result, "same-origin-resource-response", "A same-origin resource returned an error response.", result.failedResponses);
    }

    if (mode.name === "reduced-motion") {
      result.reducedMotion = await collectReducedMotionState(page);
      assertReducedMotion(result, result.reducedMotion);
    }

    await assertBookingPath(result, page, mode, route);
    await assertSketchbookNoJsFallback(result, page, mode, route);

    if (syntheticFailure && mode.name === "normal" && route.name === "home" && viewport.name === "desktop") {
      addFailure(result, "synthetic-failure", "Synthetic browser-contract failure requested by environment.");
    }
  } catch (error) {
    result.finalUrl = page.url();
    addFailure(result, "browser-contract-exception", error instanceof Error ? error.message : String(error));
  }

  let artifact;
  if (result.failures.length) {
    try {
      const directory = resolve(artifactRoot, result.mode);
      const screenshotPath = resolve(directory, `${result.route.name}-${result.viewport.name}.png`);
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      artifact = writeFailureArtifact(result);
    } catch (error) {
      result.artifactError = error instanceof Error ? error.message : String(error);
    }
  }

  await context.close();
  return { ...result, ...(artifact ? { artifact } : {}) };
}

async function main() {
  // Passing runs must not leave stale evidence from an earlier failure.
  rmSync(artifactRoot, { recursive: true, force: true });

  const browser = await chromium.launch();
  const results = [];
  try {
    for (const mode of modes) {
      for (const route of browserRoutes) {
        for (const viewport of BROWSER_VIEWPORTS) {
          results.push(await runCase(browser, mode, route, viewport));
        }
      }
    }

    const noJsMode = modes.find((mode) => mode.name === "no-js");
    if (!noJsMode) throw new Error("Browser contract is missing its no-JavaScript mode.");
    for (const viewport of BROWSER_VIEWPORTS) {
      results.push(await runCase(browser, noJsMode, sketchbookNoJsRoute, viewport));
    }
  } finally {
    await browser.close();
  }

  const failures = results.filter((result) => result.failures.length > 0);
  if (failures.length) {
    mkdirSync(artifactRoot, { recursive: true });
    writeFileSync(
      resolve(artifactRoot, "summary.json"),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseUrl,
          syntheticFailure,
          syntheticUnexpectedRedirect,
          totalCases: results.length,
          failures: failures.length,
          results
        },
        null,
        2
      )}\n`
    );
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        totalCases: results.length,
        failures: failures.length,
        passed: results.length - failures.length,
        artifactRoot: failures.length ? artifactRoot : undefined
      },
      null,
      2
    )
  );

  if (failures.length) process.exitCode = 1;
}

await main();
