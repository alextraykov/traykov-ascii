import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
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
const requestedViewportNames = (process.env.BROWSER_CONTRACT_VIEWPORTS || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const unknownViewportNames = requestedViewportNames.filter(
  (name) => !BROWSER_VIEWPORTS.some((viewport) => viewport.name === name)
);
if (unknownViewportNames.length) {
  throw new Error(`Unknown browser-contract viewport(s): ${unknownViewportNames.join(", ")}`);
}
const contractViewports = requestedViewportNames.length
  ? BROWSER_VIEWPORTS.filter((viewport) => requestedViewportNames.includes(viewport.name))
  : BROWSER_VIEWPORTS;
const browserRoutes = Object.freeze([
  ...HARD_BROWSER_ROUTES,
  {
    name: "contact",
    path: "/contact/",
    requiredSelectors: ["#contact-title", ".contact-call"]
  }
]);
const generatedImageRoots = Object.freeze(["case-studies", "notes"]);
const intrinsicImageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
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

function getStaticHtmlFiles(directory) {
  if (!existsSync(directory)) return [];

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...getStaticHtmlFiles(file));
    else if (entry.isFile() && entry.name === "index.html") files.push(file);
  }
  return files;
}

function readImageTagSource(tag) {
  const match = tag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function hasPositiveImageDimension(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i"));
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0;
}

function localStaticImagePath(source) {
  if (!source?.startsWith("/") || source.startsWith("//")) return undefined;

  try {
    const url = new URL(source, baseOrigin);
    if (url.origin !== baseOrigin || !intrinsicImageExtensions.has(extname(url.pathname).toLowerCase())) return undefined;
    return url.pathname;
  } catch {
    return undefined;
  }
}

function assertGeneratedLocalImageDimensions() {
  const distRoot = resolve("dist");
  const missing = [];
  let pages = 0;
  let localImages = 0;

  for (const root of generatedImageRoots) {
    const directory = resolve(distRoot, root);
    for (const file of getStaticHtmlFiles(directory)) {
      pages += 1;
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
        const tag = match[0];
        const source = readImageTagSource(tag);
        const pathname = localStaticImagePath(source);
        if (!pathname) continue;

        localImages += 1;
        if (hasPositiveImageDimension(tag, "width") && hasPositiveImageDimension(tag, "height")) continue;
        missing.push({ file: relative(process.cwd(), file), source: pathname, tag });
      }
    }
  }

  const result = {
    route: { name: "generated-local-image-dimensions", path: "dist/case-studies/ + dist/notes/" },
    viewport: { name: "static-output", width: 0, height: 0, hasTouch: false },
    mode: "build-output",
    failures: []
  };
  result.generatedLocalImageDimensions = { pages, localImages, missing };

  if (!pages || missing.length) {
    addFailure(
      result,
      "generated-local-image-dimensions",
      "Generated case-study and note HTML must reserve intrinsic space for every local image before a browser can request it.",
      result.generatedLocalImageDimensions
    );
  }

  return result;
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

async function assertInternetFeelsDeadLayout(result, page, route) {
  if (route.name !== "internet-feels-dead") return;

  const state = await page.evaluate(() => {
    const tolerance = 1;
    const readRect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const contains = (outer, inner) =>
      Boolean(
        outer &&
          inner &&
          inner.left >= outer.left - tolerance &&
          inner.right <= outer.right + tolerance
      );
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const note = readRect("main.note-page");
    const article = readRect(".note-page > article");
    const header = readRect(".note-header");
    const field = readRect(".note-ascii-flow-field");
    const fieldStage = readRect(".note-ascii-flow-field [data-ascii-banner-stage]");
    const body = readRect(".note-body");
    const fieldCenter = field ? field.left + field.width / 2 : Number.NaN;

    return {
      viewport,
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      },
      note,
      article,
      header,
      field,
      fieldStage,
      body,
      articleWithinNote: contains(note, article),
      headerWithinArticle: contains(article, header),
      bodyWithinArticle: contains(article, body),
      fieldWithinViewport: Boolean(field && field.left >= -tolerance && field.right <= viewport.width + tolerance),
      fieldCentered: Number.isFinite(fieldCenter) && Math.abs(fieldCenter - viewport.width / 2) <= tolerance,
      fieldStageWithinField: contains(field, fieldStage),
      fieldIsAtLeastArticleWidth: Boolean(field && article && field.width >= article.width - tolerance),
      desktopFullBleed: viewport.width < 1180 || Boolean(field && article && field.width > article.width + tolerance)
    };
  });

  result.internetFeelsDeadLayout = state;

  const missingNodes = ["note", "article", "header", "field", "fieldStage", "body"].filter((key) => !state[key]);
  if (missingNodes.length) {
    addFailure(result, "internet-feels-dead-layout-nodes", "The note layout is missing a required reading or ASCII surface.", {
      missingNodes,
      state
    });
    return;
  }

  if (!state.articleWithinNote || !state.headerWithinArticle || !state.bodyWithinArticle) {
    addFailure(
      result,
      "internet-feels-dead-reading-bounds",
      "The article or its readable surfaces escaped the note reading column.",
      state
    );
  }

  if (
    !state.fieldWithinViewport ||
    !state.fieldCentered ||
    !state.fieldStageWithinField ||
    !state.fieldIsAtLeastArticleWidth ||
    !state.desktopFullBleed
  ) {
    addFailure(
      result,
      "internet-feels-dead-ascii-bounds",
      "The full-bleed ASCII field lost its centered, viewport-bounded layout.",
      state
    );
  }
}

async function assertCaseReadingTools(result, page, mode, route, viewport) {
  if (!new Set(["designing-pave", "pipelines", "connection-central", "synapse-sys"]).has(route.name)) return;

  const originalViewport = page.viewportSize();
  const originalLocation = await page.evaluate(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    scrollY: window.scrollY
  }));
  const state = {
    mode: mode.name,
    viewport: viewport.name,
    initial: undefined,
    afterScroll: undefined,
    afterClick: undefined,
    afterScrollReady: false,
    afterClickReady: false,
    compact: undefined,
    compactOpen: undefined,
    failures: []
  };

  const inspect = () => page.evaluate(() => {
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
    const tools = document.querySelector("[data-case-reading-tools]");
    const layout = tools?.closest(".case-reader-layout");
    const toc = document.querySelector(".case-toc");
    const tocList = toc?.querySelector("ol");
    const tocToggle = toc?.querySelector("[data-case-toc-toggle]");
    const links = [...document.querySelectorAll("[data-case-target]")];
    const walkthroughPreviewVideo = document.querySelector("[data-case-walkthrough-open] video");
    const walkthroughModalVideo = document.querySelector("[data-case-walkthrough-video]");
    const videoState = (video) =>
      video instanceof HTMLVideoElement
        ? {
            exists: true,
            autoplay: video.autoplay,
            loop: video.loop,
            paused: video.paused,
            controls: video.controls
          }
        : {
            exists: false,
            autoplay: false,
            loop: false,
            paused: true,
            controls: false
          };
    const headingState = links.map((link) => {
      const href = link.getAttribute("href") || "";
      let parsed;
      try {
        parsed = new URL(href, window.location.href);
      } catch {
        parsed = null;
      }
      const targetId = parsed?.hash ? decodeURIComponent(parsed.hash.slice(1)) : "";
      const target = targetId ? document.getElementById(targetId) : null;
      const rect = link.getBoundingClientRect();
      return {
        tagName: link.tagName.toLowerCase(),
        href,
        sameOrigin: parsed?.origin === window.location.origin,
        targetId,
        targetExists: target instanceof HTMLElement,
        targetIsHeading: target instanceof HTMLElement && /^H[2-6]$/.test(target.tagName),
        targetTop: target instanceof HTMLElement ? target.getBoundingClientRect().top : null,
        width: rect.width,
        height: rect.height,
        active: link.getAttribute("aria-current") === "location"
      };
    });
    const firstHeading = headingState[0]?.targetId ? document.getElementById(headingState[0].targetId) : null;
    const toolsStyle = tools instanceof HTMLElement ? getComputedStyle(tools) : null;
    const listStyle = tocList instanceof HTMLElement ? getComputedStyle(tocList) : null;
    const headingStyle = firstHeading instanceof HTMLElement ? getComputedStyle(firstHeading) : null;
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

    return {
      visible: isVisible(tools) && isVisible(toc),
      toolsPosition: toolsStyle?.position || "",
      toolsTop: Number.parseFloat(toolsStyle?.top || "NaN"),
      toolsRect: tools instanceof HTMLElement
        ? { width: tools.getBoundingClientRect().width, height: tools.getBoundingClientRect().height }
        : { width: 0, height: 0 },
      layoutColumns: layout instanceof HTMLElement ? getComputedStyle(layout).gridTemplateColumns : "",
      listOverflowX: listStyle?.overflowX || "",
      listOverflowY: listStyle?.overflowY || "",
      listScrollWidth: tocList instanceof HTMLElement ? tocList.scrollWidth : 0,
      listClientWidth: tocList instanceof HTMLElement ? tocList.clientWidth : 0,
      listVisible: isVisible(tocList),
      tocEnhanced: toc instanceof HTMLElement && toc.dataset.caseTocEnhanced === "true",
      tocOpen: toc instanceof HTMLElement && toc.dataset.open === "true",
      toggleVisible: isVisible(tocToggle),
      toggleHeight: tocToggle instanceof HTMLElement ? tocToggle.getBoundingClientRect().height : 0,
      toggleExpanded: tocToggle?.getAttribute("aria-expanded") || "",
      toggleCurrent: tocToggle?.querySelector("[data-case-toc-current]")?.textContent?.trim() || "",
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      headingScrollMarginTop: Number.parseFloat(headingStyle?.scrollMarginTop || "NaN"),
      walkthroughPreview: videoState(walkthroughPreviewVideo),
      walkthroughModal: videoState(walkthroughModalVideo),
      activeCount: headingState.filter((link) => link.active).length,
      activeId: headingState.find((link) => link.active)?.targetId || "",
      tocLinks: headingState,
      activeTransitionMs: (() => {
        const active = links.find((link) => link.getAttribute("aria-current") === "location");
        if (!(active instanceof HTMLElement)) return Number.POSITIVE_INFINITY;
        return Math.max(
          durationToMs(getComputedStyle(active).transitionDuration),
          durationToMs(getComputedStyle(active, "::before").transitionDuration)
        );
      })()
    };
  });

  const resetDocument = async () => {
    await page.evaluate(({ pathname, search, hash }) => {
      window.history.replaceState(null, "", `${pathname}${search}${hash}`);
      window.scrollTo({ top: 0, behavior: "auto" });
    }, originalLocation);
    await page.waitForTimeout(120);
  };

  const waitForActive = async (id) => {
    try {
      await page.waitForFunction(
        (targetId) => document.querySelector(`[data-case-target="${CSS.escape(targetId)}"][aria-current="location"]`) !== null,
        id,
        { timeout: 4_000 }
      );
      return true;
    } catch {
      return false;
    }
  };

  const openCompactToc = async () => {
    const toggle = page.locator("[data-case-toc-toggle]");
    if ((await toggle.count()) === 0 || !(await toggle.isVisible())) return;
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  };

  const assertCommon = (snapshot, { expectActive }) => {
    const invalidLinks = snapshot.tocLinks.filter(
      (link) =>
        link.tagName !== "a" ||
        !link.href.startsWith("#") ||
        !link.sameOrigin ||
        !link.targetId ||
        !link.targetExists ||
        !link.targetIsHeading
    );
    if (!snapshot.visible) {
      addFailure(result, "case-reading-tools-visible", "Case reading tools were not visible at rest.", snapshot);
      state.failures.push("case-reading-tools-visible");
    }
    if (snapshot.toolsPosition !== "sticky") {
      addFailure(result, "case-reading-tools-sticky", "Case reading tools did not use sticky positioning.", snapshot);
      state.failures.push("case-reading-tools-sticky");
    }
    if (invalidLinks.length) {
      addFailure(result, "case-reading-tools-anchors", "Case reading links did not resolve to heading targets.", invalidLinks);
      state.failures.push("case-reading-tools-anchors");
    }
    if (expectActive && snapshot.activeCount !== 1) {
      addFailure(result, "case-reading-tools-active-count", "Case reading tools did not expose exactly one active section.", snapshot);
      state.failures.push("case-reading-tools-active-count");
    }
    if (!expectActive && snapshot.activeCount !== 0) {
      addFailure(result, "case-reading-tools-no-js-active", "No-JavaScript case reading tools unexpectedly exposed active state.", snapshot);
      state.failures.push("case-reading-tools-no-js-active");
    }
    if (
      snapshot.walkthroughPreview.exists &&
      (snapshot.walkthroughPreview.autoplay || snapshot.walkthroughPreview.loop || !snapshot.walkthroughPreview.paused)
    ) {
      addFailure(
        result,
        "case-walkthrough-preview-rest-state",
        "Decorative walkthrough preview did not remain a static poster at rest.",
        snapshot.walkthroughPreview
      );
      state.failures.push("case-walkthrough-preview-rest-state");
    }
    if (snapshot.walkthroughPreview.exists && (!snapshot.walkthroughModal.exists || !snapshot.walkthroughModal.controls)) {
      addFailure(
        result,
        "case-walkthrough-modal-contract",
        "Walkthrough preview lost its separately controllable modal video.",
        snapshot
      );
      state.failures.push("case-walkthrough-modal-contract");
    }
  };

  try {
    await resetDocument();
    state.initial = await inspect();
    assertCommon(state.initial, { expectActive: mode.name !== "no-js" });

    if (mode.name === "no-js") return;

    if (mode.name === "reduced-motion") {
      if (state.initial.activeTransitionMs > 1) {
        addFailure(
          result,
          "case-reading-tools-reduced-transition",
          "Reduced-motion case navigation retained an active-link transition.",
          state.initial
        );
        state.failures.push("case-reading-tools-reduced-transition");
      }

      const laterLink = page.locator("[data-case-target]").nth(Math.min(1, state.initial.tocLinks.length - 1));
      if (state.initial.tocLinks.length > 1) {
        await openCompactToc();
        await laterLink.click();
        await page.waitForTimeout(120);
        state.afterClick = await inspect();
        if (state.afterClick.activeCount !== 1 || state.afterClick.activeId !== state.afterClick.tocLinks[1].targetId) {
          addFailure(
            result,
            "case-reading-tools-reduced-active",
            "Reduced-motion case navigation did not preserve semantic active state after a click.",
            state.afterClick
          );
          state.failures.push("case-reading-tools-reduced-active");
        }
      }
      return;
    }

    if (mode.name !== "normal") return;

    const laterIndex = Math.min(1, state.initial.tocLinks.length - 1);
    if (laterIndex >= 1) {
      const laterId = state.initial.tocLinks[laterIndex].targetId;
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "auto" }), laterId);
      state.afterScrollReady = await waitForActive(laterId);
      state.afterScroll = await inspect();
      if (!state.afterScrollReady || state.afterScroll.activeCount !== 1 || state.afterScroll.activeId !== laterId) {
        addFailure(result, "case-reading-tools-scroll-active", "Scrolling to a later case section did not update active state.", state.afterScroll);
        state.failures.push("case-reading-tools-scroll-active");
      }

      const lastIndex = state.initial.tocLinks.length - 1;
      await openCompactToc();
      await page.locator("[data-case-target]").nth(lastIndex).click();
      state.afterClickReady = await waitForActive(state.initial.tocLinks[lastIndex].targetId);
      state.afterClick = await inspect();
      const expectedHash = `#${state.initial.tocLinks[lastIndex].targetId}`;
      if (!state.afterClickReady || new URL(page.url()).hash !== expectedHash || state.afterClick.activeCount !== 1 || state.afterClick.activeId !== state.initial.tocLinks[lastIndex].targetId) {
        addFailure(result, "case-reading-tools-click-active", "Clicking a later case section did not update the hash and active state.", {
          expectedHash,
          actualHash: new URL(page.url()).hash,
          state: state.afterClick
        });
        state.failures.push("case-reading-tools-click-active");
      }
    }

    if (viewport.name === "desktop") {
      const desktop = state.initial;
      if (!Number.isFinite(desktop.toolsTop) || !Number.isFinite(desktop.headingScrollMarginTop) || Math.abs(desktop.toolsTop - desktop.headingScrollMarginTop) > 2) {
        addFailure(result, "case-reading-tools-offset", "Desktop case rail top and heading scroll margin did not agree.", desktop);
        state.failures.push("case-reading-tools-offset");
      }

      await page.setViewportSize({ width: 900, height: originalViewport?.height || 1000 });
      await resetDocument();
      state.compact = await inspect();
      const compactColumns = state.compact.layoutColumns.trim().split(/\s+/).filter(Boolean).length;
      if (compactColumns !== 1 || state.compact.toolsPosition !== "sticky") {
        addFailure(result, "case-reading-tools-compact-layout", "The 900px case layout did not expose one sticky reading column.", state.compact);
        state.failures.push("case-reading-tools-compact-layout");
      }
      if (
        !state.compact.tocEnhanced ||
        !state.compact.toggleVisible ||
        state.compact.toggleHeight < 48 ||
        state.compact.toggleExpanded !== "false" ||
        state.compact.listVisible
      ) {
        addFailure(result, "case-reading-tools-compact-control", "The compact case TOC did not expose a stable collapsed section control.", state.compact);
        state.failures.push("case-reading-tools-compact-control");
      }

      await openCompactToc();
      state.compactOpen = await inspect();
      const compactTargets = state.compactOpen.tocLinks.filter((link) => link.height < 48);
      if (
        !state.compactOpen.tocOpen ||
        state.compactOpen.toggleExpanded !== "true" ||
        !state.compactOpen.listVisible ||
        !["auto", "scroll"].includes(state.compactOpen.listOverflowY)
      ) {
        addFailure(result, "case-reading-tools-compact-menu", "The compact case TOC did not expose its vertical section menu.", state.compactOpen);
        state.failures.push("case-reading-tools-compact-menu");
      }
      if (compactTargets.length) {
        addFailure(result, "case-reading-tools-compact-targets", "Compact case TOC links fell below the 48px target size.", compactTargets);
        state.failures.push("case-reading-tools-compact-targets");
      }
      if (state.compact.documentScrollWidth > state.compact.documentClientWidth + 1) {
        addFailure(result, "case-reading-tools-compact-document-overflow", "The compact case TOC caused document horizontal overflow.", state.compact);
        state.failures.push("case-reading-tools-compact-document-overflow");
      }
    }
  } finally {
    if (originalViewport && page.viewportSize()?.width !== originalViewport.width) {
      await page.setViewportSize(originalViewport);
    }
    await page.evaluate(({ pathname, search, hash, scrollY }) => {
      window.history.replaceState(null, "", `${pathname}${search}${hash}`);
      window.scrollTo({ top: scrollY, behavior: "auto" });
    }, originalLocation);
    result.caseReadingTools = state;
  }
}

async function waitForOverviewVideo(page, video, predicate, timeout = 3_000) {
  const handle = await video.elementHandle();
  if (!handle) return false;

  try {
    await page.waitForFunction(predicate, handle, { timeout });
    return true;
  } catch {
    return false;
  } finally {
    await handle.dispose();
  }
}

async function moveOverviewVideoOffscreen(page, video) {
  // Instant, like moveOverviewVideoBelowHeader: the site scrolls smoothly, and a smooth scroll still
  // running when the next step jumps back would carry the video under the header mid-assertion.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })
  );
  return waitForOverviewVideo(
    page,
    video,
    (candidate) => {
      if (!(candidate instanceof HTMLVideoElement)) return false;
      const rect = candidate.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top >= window.innerHeight;
    }
  );
}

async function positionOverviewToggleInPartialViewport(page, video) {
  await video.evaluate((candidate) => {
    if (!(candidate instanceof HTMLVideoElement)) return;
    const rect = candidate.getBoundingClientRect();
    const desiredBottom = Math.max(72, Math.min(window.innerHeight * 0.32, rect.height * 0.42));
    window.scrollTo(0, Math.max(0, window.scrollY + rect.bottom - desiredBottom));
  });
  await page.waitForTimeout(150);

  return video.evaluate((candidate) => {
    if (!(candidate instanceof HTMLVideoElement)) return { visibleFraction: 0, toggleVisible: false };
    const rect = candidate.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const toggle = candidate.closest("[data-overview-video]")?.querySelector("[data-overview-video-toggle]");
    const toggleRect = toggle?.getBoundingClientRect();
    const toggleStyle = toggle instanceof HTMLElement ? getComputedStyle(toggle) : null;
    const toggleVisible = Boolean(
      toggleRect &&
        toggleRect.width > 0 &&
        toggleRect.height > 0 &&
        toggleRect.top >= 0 &&
        toggleRect.bottom <= window.innerHeight &&
        toggleStyle?.display !== "none" &&
        toggleStyle?.visibility !== "hidden"
    );

    return {
      visibleFraction: rect.height > 0 ? visibleHeight / rect.height : 0,
      toggleVisible
    };
  });
}

async function moveOverviewVideoBehindHeader(page, video) {
  await video.evaluate((candidate) => {
    if (!(candidate instanceof HTMLVideoElement)) return;
    const header = document.querySelector(".site-nav");
    const rect = candidate.getBoundingClientRect();
    const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const desiredBottom = Math.max(0, headerBottom - 1);
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nextScroll = Math.max(0, Math.min(maxScroll, window.scrollY + rect.bottom - desiredBottom));
    window.scrollTo({ top: nextScroll, behavior: "instant" });
  });

  const paused = await waitForOverviewVideo(
    page,
    video,
    (candidate) => {
      if (!(candidate instanceof HTMLVideoElement)) return false;
      const header = document.querySelector(".site-nav");
      const root = candidate.closest("[data-overview-video]");
      const caption = root?.querySelector(".project-overview__caption");
      const videoRect = candidate.getBoundingClientRect();
      const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
      const captionRect = caption instanceof HTMLElement ? caption.getBoundingClientRect() : undefined;
      const captionVisible = Boolean(
        captionRect && captionRect.bottom > headerBottom && captionRect.top < window.innerHeight
      );

      return candidate.paused && videoRect.bottom <= headerBottom + 1 && captionVisible;
    }
  );

  const state = await video.evaluate((candidate) => {
    if (!(candidate instanceof HTMLVideoElement)) return undefined;
    const header = document.querySelector(".site-nav");
    const root = candidate.closest("[data-overview-video]");
    const caption = root?.querySelector(".project-overview__caption");
    const videoRect = candidate.getBoundingClientRect();
    const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const captionRect = caption instanceof HTMLElement ? caption.getBoundingClientRect() : undefined;
    return {
      paused: candidate.paused,
      headerBottom,
      videoTop: videoRect.top,
      videoBottom: videoRect.bottom,
      captionTop: captionRect?.top,
      captionBottom: captionRect?.bottom,
      captionVisible: Boolean(captionRect && captionRect.bottom > headerBottom && captionRect.top < window.innerHeight)
    };
  });

  return { paused, state };
}

async function moveOverviewVideoBelowHeader(page, video) {
  await video.evaluate((candidate) => {
    if (!(candidate instanceof HTMLVideoElement)) return;
    const header = document.querySelector(".site-nav");
    const rect = candidate.getBoundingClientRect();
    const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const desiredTop = headerBottom + 1;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nextScroll = Math.max(0, Math.min(maxScroll, window.scrollY + rect.top - desiredTop));
    window.scrollTo({ top: nextScroll, behavior: "instant" });
  });

  return waitForOverviewVideo(
    page,
    video,
    (candidate) => {
      if (!(candidate instanceof HTMLVideoElement)) return false;
      const header = document.querySelector(".site-nav");
      const rect = candidate.getBoundingClientRect();
      const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, headerBottom));
      return rect.top >= headerBottom && rect.height > 0 && visibleHeight / rect.height >= 0.5;
    }
  );
}

async function assertHomepagePlayback(result, page, mode) {
  const paveLead = page.locator('[data-project-overview="designing-pave"] [data-overview-video-media]').first();

  if (mode.name === "no-js") return;

  await moveOverviewVideoBelowHeader(page, paveLead);

  if (mode.name === "reduced-motion") {
    const leadStartsPaused = await paveLead.evaluate((video) => video instanceof HTMLVideoElement && video.paused);
    result.homepagePlayback = { mode: mode.name, leadStartsPaused };

    if (!leadStartsPaused) {
      addFailure(
        result,
        "homepage-overview-reduced-autoplay",
        "Reduced motion must begin on a poster rather than autoplaying product footage.",
        result.homepagePlayback
      );
      return;
    }

    const toggle = page.locator('[data-project-overview="designing-pave"] [data-overview-video-toggle]').first();
    const partialViewport = await positionOverviewToggleInPartialViewport(page, paveLead);
    await toggle.click();
    const explicitPlay = await waitForOverviewVideo(
      page,
      paveLead,
      (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
    );
    Object.assign(result.homepagePlayback, { partialViewport, explicitPlay });

    if (partialViewport.visibleFraction >= 0.5 || !partialViewport.toggleVisible) {
      addFailure(
        result,
        "homepage-overview-reduced-partial-play",
        "The custom play control was not usable while the overview was partly visible.",
        result.homepagePlayback
      );
    }

    if (!explicitPlay) {
      addFailure(
        result,
        "homepage-overview-reduced-explicit-play",
        "Reduced-motion visitors must be able to start an overview recording explicitly.",
        result.homepagePlayback
      );
    }
    return;
  }

  const leadPlaying = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );

  result.homepagePlayback = { mode: mode.name, leadPlaying };

  if (!leadPlaying) {
    addFailure(
      result,
      "homepage-overview-autoplay",
      "Visible muted overview footage did not begin playback in the normal-motion path.",
      result.homepagePlayback
    );
    return;
  }

  const paveToggle = page.locator('[data-project-overview="designing-pave"] [data-overview-video-toggle]').first();
  const headerOcclusion = await moveOverviewVideoBehindHeader(page, paveLead);
  const restoresBelowHeader = await moveOverviewVideoBelowHeader(page, paveLead);
  const resumesAfterHeaderOcclusion = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );
  Object.assign(result.homepagePlayback, { headerOcclusion, restoresBelowHeader, resumesAfterHeaderOcclusion });

  if (
    !headerOcclusion.paused ||
    !headerOcclusion.state ||
    !headerOcclusion.state.paused ||
    headerOcclusion.state.videoBottom > headerOcclusion.state.headerBottom + 1 ||
    !headerOcclusion.state.captionVisible
  ) {
    addFailure(
      result,
      "homepage-overview-header-occlusion",
      "Overview playback continued when its video was covered by the fixed header and only its caption remained visible.",
      result.homepagePlayback
    );
  }
  if (!restoresBelowHeader || !resumesAfterHeaderOcclusion) {
    addFailure(
      result,
      "homepage-overview-header-occlusion-resume",
      "A recording did not resume after it was restored below the fixed header.",
      result.homepagePlayback
    );
  }

  const scrollPageByOnePixel = async () => {
    const before = await page.evaluate(() => {
      const position = window.scrollY;
      window.scrollBy({ top: 1, behavior: "instant" });
      return position;
    });
    try {
      await page.waitForFunction((position) => window.scrollY > position, before, { timeout: 1_000 });
    } catch {
      // The recorded positions below retain the failed physical scroll as evidence.
    }
    return page.evaluate((position) => ({ before: position, after: window.scrollY }), before);
  };
  const scrollWhilePlaying = await scrollPageByOnePixel();
  await page.evaluate(
    () => new Promise((resolveFrame) => window.requestAnimationFrame(() => resolveFrame(undefined)))
  );
  const staysPlayingDuringScroll = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );

  await paveToggle.click();
  const manualPause = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && video.paused
  );

  await scrollPageByOnePixel();
  await page.evaluate(
    () => new Promise((resolveFrame) => window.requestAnimationFrame(() => resolveFrame(undefined)))
  );
  await paveToggle.click();
  const explicitPlayDuringScroll = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );
  await paveToggle.click();
  const manualPauseAfterExplicitPlay = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && video.paused
  );

  const paveLeavesViewport = await moveOverviewVideoOffscreen(page, paveLead);
  await moveOverviewVideoBelowHeader(page, paveLead);
  const manualPausePersists = await waitForOverviewVideo(
    page,
    paveLead,
    (video) => video instanceof HTMLVideoElement && video.paused
  );
  Object.assign(result.homepagePlayback, {
    scrollWhilePlaying,
    staysPlayingDuringScroll,
    manualPause,
    explicitPlayDuringScroll,
    manualPauseAfterExplicitPlay,
    paveLeavesViewport,
    manualPausePersists
  });

  if (
    scrollWhilePlaying.after <= scrollWhilePlaying.before ||
    !staysPlayingDuringScroll ||
    !manualPause ||
    !explicitPlayDuringScroll ||
    !manualPauseAfterExplicitPlay ||
    !paveLeavesViewport ||
    !manualPausePersists
  ) {
    addFailure(
      result,
      "homepage-overview-scroll-readiness",
      "Overview playback did not preserve visible playback, explicit play, and manual pause through scrolling.",
      result.homepagePlayback
    );
  }

  const synapseLead = page.locator('[data-project-overview="designing-synapse-sys"] [data-overview-video-media]').first();
  await moveOverviewVideoBelowHeader(page, synapseLead);
  const synapsePlaying = await waitForOverviewVideo(
    page,
    synapseLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );
  const synapseLeavesViewport = await moveOverviewVideoOffscreen(page, synapseLead);
  const synapseOffscreenPaused = await waitForOverviewVideo(
    page,
    synapseLead,
    (video) => {
      if (!(video instanceof HTMLVideoElement)) return false;
      const rect = video.getBoundingClientRect();
      return video.paused && (rect.bottom <= 0 || rect.top >= window.innerHeight);
    }
  );
  await moveOverviewVideoBelowHeader(page, synapseLead);
  const synapseResumes = await waitForOverviewVideo(
    page,
    synapseLead,
    (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dynamicReducedMotionPauses = await waitForOverviewVideo(
    page,
    synapseLead,
    (video) => video instanceof HTMLVideoElement && video.paused
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  Object.assign(result.homepagePlayback, {
    synapsePlaying,
    synapseLeavesViewport,
    synapseOffscreenPaused,
    synapseResumes,
    dynamicReducedMotionPauses
  });

  if (
    !synapsePlaying ||
    !synapseLeavesViewport ||
    !synapseOffscreenPaused ||
    !synapseResumes ||
    !dynamicReducedMotionPauses
  ) {
    addFailure(
      result,
      "homepage-overview-dynamic-reduced-motion",
      "Changing to reduced motion must stop currently autoplaying overview footage.",
      result.homepagePlayback
    );
  }
}

async function assertInitialWorkFragmentPlayback(result, page, mode, viewport) {
  if (mode.name !== "normal" || viewport.width > 390) return;

  const probe = await page.context().newPage();
  const loadingSource = "/case-studies/media/pave-loading-system.mp4";
  const loadingRequests = [];
  probe.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin === baseOrigin && requestUrl.pathname === loadingSource) {
      loadingRequests.push({ type: request.resourceType(), url: relativeUrl(request.url()) });
    }
  });

  try {
    await probe.goto(localUrl("/case-studies/"), { waitUntil: "domcontentloaded" });
    await probe.waitForFunction(
      () => window.location.pathname === "/" && window.location.hash === "#work",
      undefined,
      { timeout: 10_000 }
    );

    const paveLead = probe.locator('[data-project-overview="designing-pave"] [data-overview-video-media]').first();
    const paveUsable = await waitForOverviewVideo(
      probe,
      paveLead,
      (video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0
    );
    const state = await probe.evaluate(() => {
      const loading = document.querySelector(
        '#pave-loading-work [data-overview-video-media]'
      );
      const pave = document.querySelector(
        '[data-project-overview="designing-pave"] [data-overview-video-media]'
      );
      const readVideo = (candidate) => {
        if (!(candidate instanceof HTMLVideoElement)) return undefined;
        const rect = candidate.getBoundingClientRect();
        const bufferedEnd = candidate.buffered.length ? candidate.buffered.end(candidate.buffered.length - 1) : 0;
        return {
          paused: candidate.paused,
          readyState: candidate.readyState,
          bufferedEnd,
          source: candidate.querySelector("source")?.getAttribute("src") || "",
          rect: { top: rect.top, bottom: rect.bottom }
        };
      };

      return {
        pathname: window.location.pathname,
        hash: window.location.hash,
        loading: readVideo(loading),
        pave: readVideo(pave)
      };
    });
    result.homepageInitialWorkPlayback = { ...state, paveUsable, loadingRequests };

    const loading = state.loading;
    const loadingIsUnbuffered =
      loading &&
      loading.source === loadingSource &&
      loading.paused &&
      loading.readyState === 0 &&
      loading.bufferedEnd === 0 &&
      loading.rect.bottom <= 0;
    if (
      state.pathname !== "/" ||
      state.hash !== "#work" ||
      !paveUsable ||
      !loadingIsUnbuffered ||
      loadingRequests.length
    ) {
      addFailure(
        result,
        "homepage-initial-work-playback",
        "Initial Work navigation started or buffered the offscreen Pave-loading video before the final fragment position settled.",
        result.homepageInitialWorkPlayback
      );
    }
  } finally {
    await probe.close();
  }
}

async function assertHomepageSamePathAnchors(result, page, mode) {
  const latestSelector = '[data-homepage-timeline-link][href="#latest-work"]';
  const workLink = page.locator(".site-nav nav a").filter({ hasText: "Work" }).first();
  const brand = page.locator(".site-nav .brand").first();
  const state = { mode: mode.name };
  result.homepageSamePathAnchors = state;

  try {
    if (mode.name === "no-js") {
      const pollPage = async (read, matches, timeout = 5_000) => {
        const deadline = Date.now() + timeout;
        let current;
        do {
          current = await read();
          if (matches(current)) return current;
          await page.waitForTimeout(50);
        } while (Date.now() < deadline);
        return current;
      };
      const readScroll = () => page.evaluate(() => ({ url: window.location.href, scrollY: window.scrollY }));
      const readWorkClearance = () => page.evaluate(() => {
        const header = document.querySelector(".site-nav");
        const target = document.querySelector("#work");
        return {
          url: window.location.href,
          headerBottom: header?.getBoundingClientRect().bottom,
          targetTop: target?.getBoundingClientRect().top
        };
      });
      const relativeSample = (sample) => ({ ...sample, url: relativeUrl(sample.url) });
      const clickNativeAnchor = async (locator, label) => {
        await settleLayout(page);
        const [visible, box] = await Promise.all([locator.isVisible(), locator.boundingBox()]);
        if (!visible || !box || box.width <= 0 || box.height <= 0) {
          throw new Error(`Native ${label} anchor was not visibly clickable.`);
        }
        await locator.click({ force: true });
      };

      await page.goto(localUrl("/#work"), { waitUntil: "load" });
      await settleLayout(page);
      state.coldWork = relativeSample(await pollPage(readScroll, (sample) => new URL(sample.url).hash === "#work"));

      await clickNativeAnchor(page.locator(latestSelector).first(), "Latest");
      await page.waitForURL((url) => url.hash === "#latest-work");
      await settleLayout(page);
      state.latestFromWork = relativeSample(
        await pollPage(readScroll, (sample) => new URL(sample.url).hash === "#latest-work")
      );

      await clickNativeAnchor(workLink, "Work");
      await page.waitForURL((url) => url.hash === "#work");
      await settleLayout(page);
      state.workReturn = relativeSample(await pollPage(
        readWorkClearance,
        (sample) =>
          new URL(sample.url).hash === "#work" &&
          Number.isFinite(sample.headerBottom) &&
          Number.isFinite(sample.targetTop) &&
          sample.targetTop >= sample.headerBottom - 1
      ));

      await clickNativeAnchor(brand, "brand");
      await page.waitForURL((url) => url.pathname === "/" && url.hash === "");
      await settleLayout(page);
      state.brandReturn = relativeSample(await pollPage(
        readScroll,
        (sample) => new URL(sample.url).pathname === "/" && new URL(sample.url).hash === "" && sample.scrollY <= 4
      ));

      await page.goto(localUrl("/"), { waitUntil: "load" });
      await settleLayout(page);
      await clickNativeAnchor(page.locator(latestSelector).first(), "Latest");
      await page.waitForURL((url) => url.hash === "#latest-work");
      await settleLayout(page);
      await clickNativeAnchor(brand, "brand");
      await page.waitForURL((url) => url.pathname === "/" && url.hash === "");
      await settleLayout(page);
      state.brandFromInitialRoot = relativeSample(await pollPage(
        readScroll,
        (sample) => new URL(sample.url).pathname === "/" && new URL(sample.url).hash === "" && sample.scrollY <= 4
      ));
    } else {
    await page.goto(localUrl("/#work"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForFunction(() => window.location.hash === "#work");
    state.coldWork = { url: relativeUrl(page.url()), scrollY: await page.evaluate(() => window.scrollY) };

    await page.locator(latestSelector).first().click();
    await page.waitForFunction(() => window.location.hash === "#latest-work");
    state.latestFromWork = { url: relativeUrl(page.url()), scrollY: await page.evaluate(() => window.scrollY) };

    await workLink.click();
    await page.waitForFunction(() => window.location.hash === "#work");
    await page.waitForFunction(
      () => {
        const header = document.querySelector(".site-nav");
        const target = document.querySelector("#work");
        if (!(header instanceof HTMLElement) || !(target instanceof HTMLElement)) return false;
        return target.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1;
      },
      undefined,
      { timeout: 3_000 }
    );
    state.workReturn = await page.evaluate(() => {
      const header = document.querySelector(".site-nav");
      const target = document.querySelector("#work");
      return {
        url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        scrollY: window.scrollY,
        headerBottom: header?.getBoundingClientRect().bottom,
        targetTop: target?.getBoundingClientRect().top
      };
    });

    await brand.click();
    await page.waitForFunction(() => window.location.hash === "" && window.scrollY <= 4);
    state.brandReturn = { url: relativeUrl(page.url()), scrollY: await page.evaluate(() => window.scrollY) };

    await page.goto(localUrl("/"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.locator(latestSelector).first().click();
    await page.waitForFunction(() => window.location.hash === "#latest-work");
    await brand.click();
    await page.waitForFunction(() => window.location.hash === "" && window.scrollY <= 4);
    state.brandFromInitialRoot = { url: relativeUrl(page.url()), scrollY: await page.evaluate(() => window.scrollY) };
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  }

  const returnedToWork =
    state.workReturn?.url === "/#work" &&
    Number.isFinite(state.workReturn.headerBottom) &&
    Number.isFinite(state.workReturn.targetTop) &&
    state.workReturn.targetTop >= state.workReturn.headerBottom - 1;
  const brandReturnedToTop = mode.name === "no-js"
    ? state.brandReturn?.url === "/" && state.brandFromInitialRoot?.url === "/"
    : state.brandReturn?.url === "/" &&
      state.brandReturn.scrollY <= 4 &&
      state.brandFromInitialRoot?.url === "/" &&
      state.brandFromInitialRoot.scrollY <= 4;
  if (state.error || !returnedToWork || !brandReturnedToTop) {
    addFailure(
      result,
      "homepage-same-path-anchor-navigation",
      "Same-path Work and brand anchors did not retain native fragment navigation after the initial page hash changed.",
      state
    );
  }
}

async function assertHomepageTimeline(result, page, mode, route) {
  if (route.name !== "home") return;

  const timeline = page.locator("[data-homepage-timeline]");
  const expectedTargets = [
    "latest-work",
    "breathing-grids-work",
    "pave-loading-work",
    "designing-pave-overview",
    "designing-synapse-sys-overview",
    "pipelines-overview",
    "connection-central-overview"
  ];
  const expectedSource = "/case-studies/media/pave-loading-system.mp4";
  const expectedPoster = "/case-studies/media/pave-loading-system-poster.jpg";
  const count = await timeline.count();
  const detail = { count };
  result.homepageTimeline = detail;

  if (count !== 1) {
    addFailure(result, "homepage-timeline-count", "Homepage latest-work timeline is not unique.", detail);
    return;
  }

  const state = await timeline.evaluate((element) => {
    const links = [...element.querySelectorAll("[data-homepage-timeline-link]")].map((link) => ({
      target: link.getAttribute("data-homepage-timeline-target") || "",
      href: link instanceof HTMLAnchorElement ? new URL(link.href).hash : "",
      current: link.getAttribute("aria-current") || ""
    }));
    const video = element.querySelector("[data-overview-video-media]");
    const videoRoot = video?.closest("[data-overview-video]");
    const toggle = videoRoot?.querySelector("[data-overview-video-toggle]");
    const toggleRect = toggle?.getBoundingClientRect();
    const toggleStyle = toggle instanceof HTMLElement ? getComputedStyle(toggle) : null;

    return {
      ready: element.getAttribute("data-homepage-timeline-ready") || "",
      links,
      video:
        video instanceof HTMLVideoElement
          ? {
              source: video.querySelector("source")?.getAttribute("src") || "",
              width: Number.parseInt(video.getAttribute("width") || "", 10) || 0,
              height: Number.parseInt(video.getAttribute("height") || "", 10) || 0,
              muted: video.muted,
              loop: video.loop,
              playsInline: video.playsInline,
              preload: video.preload,
              autoplay: video.autoplay,
              controls: video.controls,
              controlsAttribute: video.hasAttribute("controls"),
              poster: video.getAttribute("poster") || "",
              ready: videoRoot?.getAttribute("data-overview-video-ready") || "",
              toggle: {
                hidden: toggle instanceof HTMLButtonElement ? toggle.hidden : true,
                ariaLabel: toggle?.getAttribute("aria-label") || "",
                ariaPressed: toggle?.getAttribute("aria-pressed") || "",
                visible: Boolean(
                  toggle instanceof HTMLButtonElement &&
                    !toggle.hidden &&
                    toggleStyle?.display !== "none" &&
                    toggleStyle?.visibility !== "hidden" &&
                    (toggleRect?.width || 0) >= 44 &&
                    (toggleRect?.height || 0) >= 44
                )
              }
            }
          : undefined
    };
  });
  Object.assign(detail, state);

  const linksValid =
    state.links.length === expectedTargets.length &&
    expectedTargets.every(
      (target, index) => state.links[index]?.target === target && state.links[index]?.href === `#${target}`
    ) &&
    state.links.some((link) => link.current === "location");
  const video = state.video;
  const basicVideoValid =
    video &&
    video.source === expectedSource &&
    video.width === 1280 &&
    video.height === 720 &&
    video.muted &&
    video.loop &&
    video.playsInline &&
    video.preload === "none" &&
    !video.autoplay &&
    video.poster === expectedPoster;
  const modeValid =
    mode.name === "no-js"
      ? video?.controls && video.controlsAttribute && video.toggle.hidden
      : state.ready === "true" && video?.ready === "true" && !video.controls && !video.controlsAttribute && video.toggle.visible &&
        Boolean(video.toggle.ariaLabel) && ["true", "false"].includes(video.toggle.ariaPressed);

  if (!linksValid || !basicVideoValid || !modeValid) {
    addFailure(
      result,
      "homepage-timeline-contract",
      "Latest-work timeline lost its anchors, combined media, or progressive playback fallback.",
      detail
    );
  }

  if (mode.name === "no-js" || !video) return;

  const latestVideo = timeline.locator("[data-overview-video-media]").first();
  await latestVideo.scrollIntoViewIfNeeded();

  if (mode.name === "reduced-motion") {
    const startsPaused = await latestVideo.evaluate((candidate) => candidate instanceof HTMLVideoElement && candidate.paused);
    const toggle = timeline.locator("[data-overview-video-toggle]").first();
    await toggle.click();
    const explicitPlay = await waitForOverviewVideo(
      page,
      latestVideo,
      (candidate) => candidate instanceof HTMLVideoElement && !candidate.paused && candidate.currentTime > 0
    );
    result.homepageLatestPlayback = { mode: mode.name, startsPaused, explicitPlay };

    if (!startsPaused || !explicitPlay) {
      addFailure(
        result,
        "homepage-timeline-reduced-motion",
        "Reduced-motion visitors must start the combined latest-work recording explicitly.",
        result.homepageLatestPlayback
      );
    }
    return;
  }

  const autoplay = await waitForOverviewVideo(
    page,
    latestVideo,
    (candidate) => candidate instanceof HTMLVideoElement && !candidate.paused && candidate.currentTime > 0
  );
  const leavesViewport = await moveOverviewVideoOffscreen(page, latestVideo);
  const offscreenPaused = await waitForOverviewVideo(
    page,
    latestVideo,
    (candidate) => candidate instanceof HTMLVideoElement && candidate.paused
  );
  await latestVideo.scrollIntoViewIfNeeded();
  const resumes = await waitForOverviewVideo(
    page,
    latestVideo,
    (candidate) => candidate instanceof HTMLVideoElement && !candidate.paused && candidate.currentTime > 0
  );
  const toggle = timeline.locator("[data-overview-video-toggle]").first();
  await toggle.click();
  const manualPause = await waitForOverviewVideo(
    page,
    latestVideo,
    (candidate) => candidate instanceof HTMLVideoElement && candidate.paused
  );
  await moveOverviewVideoOffscreen(page, latestVideo);
  await latestVideo.scrollIntoViewIfNeeded();
  const manualPausePersists = await waitForOverviewVideo(
    page,
    latestVideo,
    (candidate) => candidate instanceof HTMLVideoElement && candidate.paused
  );
  result.homepageLatestPlayback = {
    mode: mode.name,
    autoplay,
    leavesViewport,
    offscreenPaused,
    resumes,
    manualPause,
    manualPausePersists
  };

  if (!autoplay || !leavesViewport || !offscreenPaused || !resumes || !manualPause || !manualPausePersists) {
    addFailure(
      result,
      "homepage-timeline-playback",
      "Combined latest-work video did not preserve its in-view, offscreen, and manual-pause lifecycle.",
      result.homepageLatestPlayback
    );
  }
}

async function assertHomepageVisualOverviews(result, page, mode, route, viewport) {
  if (route.name !== "home") return;

  const contracts = [
    {
      id: "designing-pave",
      href: "/case-studies/designing-pave/",
      media: [
        { kind: "video", source: "/case-studies/media/pave-portfolio-loop.mp4" },
        { kind: "video", source: "/case-studies/media/homepage-loops/pave-plan-mode-loop.mp4" },
        { kind: "video", source: "/case-studies/media/homepage-loops/pave-direct-edit-loop.mp4" }
      ]
    },
    {
      id: "pipelines",
      href: "/case-studies/pipelines/",
      media: [
        { kind: "image", source: "/case-studies/quickbase/pipelines-oauth-connect-anatomy.webp" },
        { kind: "image", source: "/case-studies/quickbase/pipelines-code-mode.webp" }
      ]
    },
    {
      id: "connection-central",
      href: "/case-studies/connection-central/",
      media: [
        { kind: "image", source: "/case-studies/quickbase/cc-v2-ia-flow.webp" },
        { kind: "image", source: "/case-studies/quickbase/cc-resources-detail-two-pane.webp" },
        { kind: "image", source: "/case-studies/quickbase/cc-pipelines-list.webp" }
      ]
    },
    {
      id: "designing-synapse-sys",
      href: "/case-studies/designing-synapse-sys/",
      media: [
        { kind: "video", source: "/case-studies/media/homepage-loops/synapse-earlier-canvas.mp4" },
        { kind: "video", source: "/case-studies/media/homepage-loops/synapse-earlier-toolbar.mp4" },
        { kind: "image", source: "/case-studies/media/homepage-posters/synapse-edge-operations.jpg" }
      ]
    }
  ];

  result.homepageOverviews = [];
  for (const contract of contracts) {
    const selector = `[data-project-overview="${contract.id}"]`;
    const overview = page.locator(selector);
    const count = await overview.count();
    const detail = { selector, count };
    result.homepageOverviews.push(detail);

    if (count !== 1) {
      addFailure(result, "homepage-overview-count", "Homepage project overview is not unique.", detail);
      continue;
    }

    const state = await overview.evaluate((element) => {
      const link = element.querySelector("[data-project-overview-link]");
      const media = [...element.querySelectorAll("video, img.project-overview__media")].map((node) => {
        const rect = node.getBoundingClientRect();
        const isVideo = node instanceof HTMLVideoElement;
        const videoRoot = isVideo ? node.closest("[data-overview-video]") : null;
        const button = videoRoot?.querySelector("[data-overview-video-toggle]");
        const buttonRect = button?.getBoundingClientRect();
        const buttonStyle = button instanceof HTMLElement ? getComputedStyle(button) : null;
        const declaredWidth = Number.parseInt(node.getAttribute("width") || "", 10) || 0;
        const declaredHeight = Number.parseInt(node.getAttribute("height") || "", 10) || 0;
        const source = isVideo
          ? node.querySelector("source")?.getAttribute("src") || ""
          : node.getAttribute("src") || "";

        return {
          kind: isVideo ? "video" : "image",
          source,
          width: declaredWidth,
          height: declaredHeight,
          ariaLabel: node.getAttribute("aria-label") || "",
          alt: isVideo ? "" : node.getAttribute("alt") || "",
          describedBy: node.getAttribute("aria-describedby") || "",
          renderedAspect: rect.height > 0 ? rect.width / rect.height : 0,
          intrinsicAspect: declaredHeight > 0 ? declaredWidth / declaredHeight : 0,
          ...(isVideo
            ? {
                controls: node.controls,
                controlsAttribute: node.hasAttribute("controls"),
                muted: node.muted,
                playsInline: node.playsInline,
                preload: node.preload,
                autoplay: node.autoplay,
                loop: node.loop,
                poster: node.getAttribute("poster") || "",
                paused: node.paused,
                ready: videoRoot?.getAttribute("data-overview-video-ready") || "",
                toggle: {
                  hidden: button instanceof HTMLButtonElement ? button.hidden : true,
                  ariaLabel: button?.getAttribute("aria-label") || "",
                  ariaPressed: button?.getAttribute("aria-pressed") || "",
                  display: buttonStyle?.display || "",
                  visibility: buttonStyle?.visibility || "",
                  opacity: Number.parseFloat(buttonStyle?.opacity || "0"),
                  width: buttonRect?.width || 0,
                  height: buttonRect?.height || 0,
                  visible: Boolean(
                    button instanceof HTMLButtonElement &&
                      !button.hidden &&
                      buttonStyle?.display !== "none" &&
                      buttonStyle?.visibility !== "hidden" &&
                      Number.parseFloat(buttonStyle?.opacity || "0") > 0.01 &&
                      (buttonRect?.width || 0) > 0 &&
                      (buttonRect?.height || 0) > 0
                  )
                }
              }
            : {})
        };
      });

      return {
        href: link instanceof HTMLAnchorElement ? new URL(link.href).pathname : "",
        media
      };
    });
    Object.assign(detail, state);

    if (state.href !== contract.href) {
      addFailure(result, "homepage-overview-link", "Project overview lost its canonical case-study link.", detail);
    }
    if (state.media.length !== contract.media.length) {
      addFailure(result, "homepage-overview-media", "Project overview has an unexpected number of visual assets.", detail);
      continue;
    }

    const invalidMedia = state.media.find((media, index) => {
      const expected = contract.media[index];
      const basicInvalid =
        media.kind !== expected.kind ||
        media.source !== expected.source ||
        media.width <= 0 ||
        media.height <= 0 ||
        !media.describedBy ||
        Math.abs(media.renderedAspect - media.intrinsicAspect) > 0.02;

      if (basicInvalid) return true;
      if (media.kind === "image") return !media.alt;

      const fallbackInvalid =
        !media.muted ||
        !media.playsInline ||
        media.preload !== "none" ||
        media.autoplay ||
        !media.loop ||
        !media.poster ||
        !media.ariaLabel;
      const enhancedInvalid =
        mode.name === "no-js"
          ? !media.controls || !media.controlsAttribute || media.toggle.visible || media.toggle.display !== "none"
          : media.controls || media.controlsAttribute || media.ready !== "true" || !media.toggle.visible || !media.toggle.ariaLabel ||
            !["true", "false"].includes(media.toggle.ariaPressed) ||
            media.toggle.width < 44 || media.toggle.height < 44;

      return fallbackInvalid || enhancedInvalid;
    });
    if (invalidMedia) {
      addFailure(
        result,
        "homepage-overview-media-contract",
        "Homepage media lost its natural dimensions, accessible fallback, or progressive custom playback control.",
        detail
      );
    }
  }

  await assertHomepagePlayback(result, page, mode);
  await assertInitialWorkFragmentPlayback(result, page, mode, viewport);
  await assertHomepageSamePathAnchors(result, page, mode);
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

async function collectVisualContent(page, visualSelectors = []) {
  const checks = [];
  for (const visual of visualSelectors) {
    const { selector, expectedDescendants = [] } = visual;
    const locator = page.locator(selector).first();
    const count = await page.locator(selector).count();
    if (count === 0) {
      checks.push({
        selector,
        count,
        visible: false,
        hasExpectedVisual: false,
        expectedDescendants
      });
      continue;
    }

    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(550);

    const detail = await locator.evaluate((element, expected) => {
      const inspect = (candidate) => {
        const rect = candidate.getBoundingClientRect();
        const ancestorChain = [];
        let hiddenBy;
        let current = candidate;

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
          rect: { width: rect.width, height: rect.height },
          ancestorChain,
          ...(hiddenBy ? { hiddenBy } : {})
        };
      };

      const descendants = expected.map((expectedSelector) => {
        const candidate = element.querySelector(expectedSelector);
        if (!candidate) return { selector: expectedSelector, count: 0, visible: false };
        return {
          selector: expectedSelector,
          count: element.querySelectorAll(expectedSelector).length,
          ...inspect(candidate)
        };
      });

      return {
        ...inspect(element),
        expectedDescendants: expected,
        descendants,
        hasExpectedVisual: expected.length > 0 && descendants.some((descendant) => descendant.visible)
      };
    }, expectedDescendants);
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

async function assertMotionControl(result, page, mode, viewport) {
  const control = page.locator("[data-motion-toggle]");
  const count = await control.count();
  if (count !== 1) {
    addFailure(result, "motion-control-count", "Every routed page must retain one global motion control.", { count });
    return;
  }

  const readState = () => control.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const descriptionId = element.getAttribute("aria-describedby") || "";
    const description = descriptionId ? document.getElementById(descriptionId) : null;
    const visibleChildren = [...element.children]
      .filter(
        (child) =>
          child instanceof HTMLElement &&
          !child.classList.contains("visually-hidden") &&
          getComputedStyle(child).display !== "none"
      )
      .map((child) => {
        const childStyle = getComputedStyle(child);
        return {
          text: child.textContent?.trim() || "",
          transform: childStyle.transform,
          transitionProperties: childStyle.transitionProperty
        };
      });
    return {
      hidden: element instanceof HTMLButtonElement && element.hidden,
      disabled: element instanceof HTMLButtonElement && element.disabled,
      label: element.getAttribute("aria-label") || "",
      descriptionId,
      descriptionText: description?.textContent?.trim() || "",
      pressed: element.getAttribute("aria-pressed") || "",
      display: style.display,
      width: rect.width,
      height: rect.height,
      noun: element.querySelector(".motion-toggle__name")?.textContent?.trim() || "",
      nounVisible: (() => {
        const noun = element.querySelector(".motion-toggle__name");
        return noun instanceof HTMLElement && getComputedStyle(noun).display !== "none";
      })(),
      stateText: element.querySelector("[data-motion-toggle-state]")?.textContent?.trim() || "",
      transitionProperties: style.transitionProperty,
      visibleChildren
    };
  });
  const state = await readState();
  result.motionControl = state;

  if (mode.name === "no-js") {
    if (
      !state.hidden ||
      state.display !== "none" ||
      state.label !== "Motion" ||
      state.pressed !== "true" ||
      state.descriptionText !== "Motion is on"
    ) {
      addFailure(result, "motion-control-no-js", "The JavaScript-only motion control was visible without JavaScript.", state);
    }
    return;
  }

  if (state.hidden || state.display === "none" || state.width < 48 || state.height < 48) {
    addFailure(result, "motion-control-hit-target", "The global motion control was not a visible 48px target.", state);
  }
  if (mode.name === "reduced-motion") {
    if (
      !state.disabled ||
      state.label !== "Motion" ||
      state.descriptionId !== "motion-toggle-description" ||
      state.descriptionText !== "Reduced by system setting" ||
      state.pressed !== "false" ||
      state.stateText !== "REDUCED"
    ) {
      addFailure(result, "motion-control-reduced", "System reduced motion did not take precedence in the control.", state);
    }
  } else if (
    state.disabled ||
    state.label !== "Motion" ||
    state.descriptionId !== "motion-toggle-description" ||
    state.descriptionText !== "Motion is on" ||
    state.pressed !== "true" ||
    state.noun !== "MOTION" ||
    state.stateText !== "ON"
  ) {
    addFailure(result, "motion-control-active", "The running motion control lacked its explicit active state.", state);
  }
  if (
    state.transitionProperties.includes("transform") ||
    state.visibleChildren.some(
      (child) => child.transform !== "none" || child.transitionProperties.includes("transform")
    )
  ) {
    addFailure(result, "motion-control-no-transform", "The motion control or visible child retained a transform treatment.", state);
  }
  if (mode.name === "normal") {
    await control.click();
    const paused = await readState();
    result.motionControlVisitor = paused;
    if (
      paused.disabled ||
      paused.label !== "Motion" ||
      paused.descriptionId !== "motion-toggle-description" ||
      paused.descriptionText !== "Motion is off" ||
      paused.pressed !== "false" ||
      paused.stateText !== "OFF"
    ) {
      addFailure(result, "motion-control-visitor", "Visitor-paused motion did not expose its OFF state.", paused);
    }
    if (
      paused.transitionProperties.includes("transform") ||
      paused.visibleChildren.some(
        (child) => child.transform !== "none" || child.transitionProperties.includes("transform")
      )
    ) {
      addFailure(result, "motion-control-visitor-no-transform", "Paused motion control or visible child retained a transform treatment.", paused);
    }
    await control.click();
  }
  if (viewport.width <= 640) {
    if (!state.nounVisible || state.width <= 48) {
      addFailure(
        result,
        "motion-control-mobile-label",
        "The phone motion control did not retain its visible MOTION label and natural-width target.",
        state
      );
    }
  } else if (!state.nounVisible) {
    addFailure(result, "motion-control-desktop-label", "The desktop motion control hid its MOTION label.", state);
  }
}

function rectsOverlap(first, second, tolerance = 1) {
  return (
    first.left < second.right - tolerance &&
    second.left < first.right - tolerance &&
    first.top < second.bottom - tolerance &&
    second.top < first.bottom - tolerance
  );
}

async function settleLayout(page, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  let previous;
  let stableSamples = 0;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const current = await page.evaluate(() => ({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight
      }));
      const unchanged =
        previous &&
        Math.abs(current.scrollX - previous.scrollX) <= 0.5 &&
        Math.abs(current.scrollY - previous.scrollY) <= 0.5 &&
        current.scrollWidth === previous.scrollWidth &&
        current.scrollHeight === previous.scrollHeight &&
        current.clientWidth === previous.clientWidth &&
        current.clientHeight === previous.clientHeight;
      stableSamples = unchanged ? stableSamples + 1 : 0;
      if (stableSamples >= 3) return current;
      previous = current;
      lastError = undefined;
    } catch (error) {
      lastError = error;
      stableSamples = 0;
    }
    await page.waitForTimeout(50);
  }

  if (lastError) throw lastError;
  throw new Error("Layout did not settle before the browser-contract timeout.");
}

async function collectNavigationThemeState(page, theme) {
  return page.evaluate((requestedTheme) => {
    const tolerance = 1;
    const readRect = (element) => {
      if (!(element instanceof HTMLElement)) return undefined;
      const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
      return { top, right, bottom, left, width, height };
    };
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
    const header = document.querySelector(".site-nav");
    const links = [...document.querySelectorAll(".site-nav nav > a")];
    const headerStyle = header instanceof HTMLElement ? getComputedStyle(header) : null;
    const bodyStyle = getComputedStyle(document.body);
    const rectsIntersect = (first, second) =>
      Boolean(
        first &&
          second &&
          first.left < second.right - tolerance &&
          second.left < first.right - tolerance &&
          first.top < second.bottom - tolerance &&
          second.top < first.bottom - tolerance
      );
    const themeLinks = links.map((link) => {
      const style = getComputedStyle(link);
      return { visible: isVisible(link), color: style.color, rect: readRect(link) };
    });
    const overlaps = [];
    for (let index = 0; index < themeLinks.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < themeLinks.length; nextIndex += 1) {
        if (rectsIntersect(themeLinks[index].rect, themeLinks[nextIndex].rect)) overlaps.push([index, nextIndex]);
      }
    }
    return {
      theme: requestedTheme || document.documentElement.dataset.theme || "current",
      headerBackground: headerStyle?.backgroundColor || "",
      underlayBackground: bodyStyle.backgroundColor || "",
      headerColor: headerStyle?.color || "",
      links: themeLinks,
      overlaps
    };
  }, theme);
}

async function collectResponsiveNavigationThemes(page, includeThemeVariants) {
  if (!includeThemeVariants) return [await collectNavigationThemeState(page, undefined)];

  const originalPreference = await page.evaluate(() => {
    const controller = window.__traykovTheme;
    return controller?.preference || document.documentElement.dataset.themePreference || document.documentElement.dataset.theme || "auto";
  });
  const themes = [];
  try {
    for (const theme of ["light", "dark"]) {
      await page.evaluate((nextTheme) => {
        const controller = window.__traykovTheme;
        if (controller?.set) {
          controller.set(nextTheme);
          return;
        }
        document.documentElement.dataset.themePreference = nextTheme;
        document.documentElement.dataset.theme = nextTheme;
      }, theme);
      await settleLayout(page);
      themes.push(await collectNavigationThemeState(page, theme));
    }
  } finally {
    await page.evaluate((preference) => {
      const controller = window.__traykovTheme;
      if (controller?.set) {
        controller.set(preference);
        return;
      }
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.dataset.theme = preference === "auto" ? "light" : preference;
    }, originalPreference);
    await settleLayout(page);
  }
  return themes;
}

async function collectResponsiveNavigation(page, includeThemeVariants) {
  const themeStates = await collectResponsiveNavigationThemes(page, includeThemeVariants);
  return page.evaluate((themes) => {
    const tolerance = 1;
    const readRect = (element) => {
      if (!(element instanceof HTMLElement)) return undefined;
      const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
      return { top, right, bottom, left, width, height };
    };
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
    const rectsIntersect = (first, second) =>
      Boolean(
        first &&
          second &&
          first.left < second.right - tolerance &&
          second.left < first.right - tolerance &&
          first.top < second.bottom - tolerance &&
          second.top < first.bottom - tolerance
      );
    const header = document.querySelector(".site-nav");
    const brand = document.querySelector(".site-nav .brand");
    const nav = document.querySelector(".site-nav nav");
    const controls = document.querySelector(".site-nav__controls");
    const links = nav ? [...nav.querySelectorAll(":scope > a")] : [];
    const headerRect = readRect(header);
    const navRect = readRect(nav);
    const brandRect = readRect(brand);
    const controlsRect = readRect(controls);
    const headerStyle = header instanceof HTMLElement ? getComputedStyle(header) : null;
    const navLinks = links.map((link) => {
      const rect = readRect(link);
      const style = getComputedStyle(link);
      return {
        text: (link.textContent || "").trim(),
        rect,
        visible: isVisible(link),
        fontSize: Number.parseFloat(style.fontSize || "0")
      };
    });
    const overlaps = [];
    for (let index = 0; index < navLinks.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < navLinks.length; nextIndex += 1) {
        if (rectsIntersect(navLinks[index].rect, navLinks[nextIndex].rect)) {
          overlaps.push([navLinks[index].text, navLinks[nextIndex].text]);
        }
      }
    }

    const paddingLeft = Number.parseFloat(headerStyle?.paddingLeft || "0");
    const paddingRight = Number.parseFloat(headerStyle?.paddingRight || "0");
    const innerLeft = headerRect ? headerRect.left + paddingLeft : Number.NaN;
    const innerRight = headerRect ? headerRect.right - paddingRight : Number.NaN;
    const topRowBottom = Math.max(brandRect?.bottom || Number.NEGATIVE_INFINITY, controlsRect?.bottom || Number.NEGATIVE_INFINITY);
    const brandBeforeNav = Boolean(
      brand && nav && brand.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    const navBeforeControls = Boolean(
      nav && controls && nav.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING
    );

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      },
      header: { visible: isVisible(header), rect: headerRect, innerLeft, innerRight },
      brand: { visible: isVisible(brand), rect: brandRect },
      controls: { visible: isVisible(controls), rect: controlsRect },
      nav: {
        visible: isVisible(nav),
        rect: navRect,
        links: navLinks,
        overlaps,
        belowTopRow: Boolean(navRect && navRect.top >= topRowBottom - tolerance),
        fillsHeader: Boolean(
          navRect &&
            Number.isFinite(innerLeft) &&
            Number.isFinite(innerRight) &&
            navRect.left >= innerLeft - tolerance &&
            navRect.right <= innerRight + tolerance
        )
      },
      logicalOrder: { brandBeforeNav, navBeforeControls },
      themes
    };
  }, themeStates);
}

function isPaintedColor(value) {
  return Boolean(value) && value !== "transparent" && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(value);
}

async function assertResponsiveNavigation(result, page, mode, route, viewport) {
  if (!new Set(["home", "designing-pave", "contact"]).has(route.name)) return;

  const originalViewport = page.viewportSize();
  const samples = [{ name: viewport.name, width: viewport.width, height: viewport.height }];
  if (viewport.name === "mobile" && originalViewport) {
    samples.push({ name: "mobile-640", width: 640, height: originalViewport.height });
  }

  const states = [];
  try {
    for (const sample of samples) {
      if (originalViewport && (sample.width !== originalViewport.width || sample.height !== originalViewport.height)) {
        await page.setViewportSize({ width: sample.width, height: sample.height });
        await settleLayout(page);
      }
      states.push({ sample, state: await collectResponsiveNavigation(page, mode.name !== "no-js") });
    }
  } finally {
    if (
      originalViewport &&
      (page.viewportSize()?.width !== originalViewport.width || page.viewportSize()?.height !== originalViewport.height)
    ) {
      await page.setViewportSize(originalViewport);
      await settleLayout(page);
    }
  }

  result.responsiveNavigation = { mode: mode.name, states };
  for (const { sample, state } of states) {
    const missingStructure =
      !state.header.visible ||
      !state.brand.visible ||
      !state.controls.visible ||
      !state.nav.visible ||
      state.nav.links.length !== 5 ||
      !state.logicalOrder.brandBeforeNav ||
      !state.logicalOrder.navBeforeControls;
    const themeFailure = state.themes.some(
      (theme) =>
        (!isPaintedColor(theme.headerBackground) && !isPaintedColor(theme.underlayBackground)) ||
        !isPaintedColor(theme.headerColor) ||
        theme.links.some((link) => !link.visible || !isPaintedColor(link.color)) ||
        theme.overlaps.length
    );
    const overflow = state.document.scrollWidth > state.document.clientWidth + 1;
    const linkOverlap = state.nav.overlaps.length > 0;
    const phone = sample.width <= 640;
    const phoneFailure =
      phone &&
      (!state.nav.belowTopRow ||
        !state.nav.fillsHeader ||
        state.nav.links.some(
          (link) => !link.visible || link.fontSize < 12 || !link.rect || link.rect.width < 48 || link.rect.height < 48
        ));

    if (missingStructure || themeFailure || overflow || linkOverlap || phoneFailure) {
      addFailure(
        result,
        "responsive-navigation-geometry",
        "Primary navigation lost its ordered, legible, non-overlapping layout in a tested theme or viewport.",
        { sample, state }
      );
    }
  }
}

async function assertContactAvailability(result, page, route) {
  if (route.name !== "contact") return;

  const state = await page.evaluate(() => {
    const form = document.querySelector("form[data-contact-form]");
    const direct = document.querySelector("[data-contact-direct]");
    const editable = [...document.querySelectorAll("main input, main textarea, main select")].map((control) => ({
      tag: control.tagName.toLowerCase(),
      name: control.getAttribute("name") || "",
      disabled: control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement
        ? control.disabled
        : false
    }));
    const inputs = form ? [...form.querySelectorAll("input, textarea")].map((control) => control.getAttribute("name") || "") : [];
    const submit = form?.querySelector("[data-contact-submit]");
    const mailto = direct?.querySelector('a[href="mailto:hi@traykov.cc"]');
    const directText = (direct?.textContent || "").replace(/\s+/g, " ").trim();

    return {
      formCount: document.querySelectorAll("form[data-contact-form]").length,
      directCount: document.querySelectorAll("[data-contact-direct]").length,
      directMailto: mailto instanceof HTMLAnchorElement ? mailto.getAttribute("href") || "" : "",
      directText,
      editable,
      inputNames: inputs,
      turnstileCount: form?.querySelectorAll(".cf-turnstile").length || 0,
      submitDisabled: submit instanceof HTMLButtonElement ? submit.disabled : undefined,
      noscriptCount: form?.querySelectorAll("noscript").length || 0
    };
  });
  result.contactAvailability = state;

  const configured = state.turnstileCount === 1;
  const fallbackValid =
    state.formCount === 0 &&
    state.directCount === 1 &&
    state.directMailto === "mailto:hi@traykov.cc" &&
    state.editable.length === 0 &&
    !/secure sending|not configured|turnstile/i.test(state.directText);
  const configuredValid =
    state.formCount === 1 &&
    state.directCount === 0 &&
    ["name", "email", "message"].every((name) => state.inputNames.includes(name)) &&
    state.submitDisabled === false &&
    state.noscriptCount === 1;
  if ((!configured && !fallbackValid) || (configured && !configuredValid)) {
    addFailure(
      result,
      "contact-availability-branch",
      "Contact did not expose the expected configured form or the direct-email fallback branch.",
      state
    );
  }
}

async function collectAnchorClearance(page, route) {
  if (route.name === "home") {
    await page.evaluate(() => document.querySelector("#work")?.scrollIntoView({ block: "start", behavior: "auto" }));
    await settleLayout(page);
    return page.evaluate(() => {
      const header = document.querySelector(".site-nav");
      const target = document.querySelector("#work");
      const headerRect = header?.getBoundingClientRect();
      const targetRect = target?.getBoundingClientRect();
      return {
        kind: "home",
        headerBottom: headerRect?.bottom,
        targetTop: targetRect?.top,
        targetExists: target instanceof HTMLElement
      };
    });
  }

  const targetId = await page.locator("[data-case-target]").first().evaluate((link) => {
    if (!(link instanceof HTMLAnchorElement)) return "";
    return new URL(link.href).hash.slice(1);
  });
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "auto" }), targetId);
  await settleLayout(page);
  return page.evaluate((id) => {
    const header = document.querySelector(".site-nav");
    const tools = document.querySelector("[data-case-reading-tools]");
    const target = document.getElementById(id);
    const headerRect = header?.getBoundingClientRect();
    const toolsRect = tools?.getBoundingClientRect();
    const targetRect = target?.getBoundingClientRect();
    return {
      kind: "case",
      headerBottom: headerRect?.bottom,
      toolsTop: toolsRect?.top,
      targetTop: targetRect?.top,
      targetExists: target instanceof HTMLElement,
      toolsExists: tools instanceof HTMLElement
    };
  }, targetId);
}

async function assertMobileAnchorClearance(result, page, route, viewport) {
  if (viewport.width > 820 || !new Set(["home", "designing-pave"]).has(route.name)) return;

  const originalViewport = page.viewportSize();
  const originalScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const samples = [{ name: viewport.name, width: viewport.width, height: viewport.height }];
  if (viewport.name === "mobile" && originalViewport) {
    samples.push({ name: "mobile-640", width: 640, height: originalViewport.height });
  }

  const states = [];
  try {
    for (const sample of samples) {
      if (originalViewport && (sample.width !== originalViewport.width || sample.height !== originalViewport.height)) {
        await page.setViewportSize({ width: sample.width, height: sample.height });
        await settleLayout(page);
      }
      states.push({ sample, state: await collectAnchorClearance(page, route) });
    }
  } finally {
    if (
      originalViewport &&
      (page.viewportSize()?.width !== originalViewport.width || page.viewportSize()?.height !== originalViewport.height)
    ) {
      await page.setViewportSize(originalViewport);
    }
    await page.evaluate(({ x, y }) => window.scrollTo({ left: x, top: y, behavior: "auto" }), originalScroll);
  }

  result.mobileAnchorClearance = states;
  for (const { sample, state } of states) {
    const clearanceFailure =
      !state.targetExists ||
      !Number.isFinite(state.headerBottom) ||
      !Number.isFinite(state.targetTop) ||
      state.targetTop < state.headerBottom - 1 ||
      (state.kind === "case" && (!state.toolsExists || !Number.isFinite(state.toolsTop) || state.toolsTop < state.headerBottom - 1));
    if (clearanceFailure) {
      addFailure(
        result,
        "mobile-anchor-clearance",
        "A homepage or case anchor stopped below the sticky header or reading tools.",
        { sample, state }
      );
    }
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
    hasTouch: Boolean(viewport.hasTouch),
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
    visualContent: [],
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
      await page.waitForLoadState("load");
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

    result.visualContent = await collectVisualContent(page, route.visualSelectors);
    for (const visual of result.visualContent) {
      if (!visual.visible || !visual.hasExpectedVisual) {
        addFailure(
          result,
          "visual-content",
          `Visual content is not visible with a rendered media or fallback descendant: ${visual.selector}`,
          visual
        );
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

    await assertMotionControl(result, page, mode, viewport);
    await assertBookingPath(result, page, mode, route);
    await assertSketchbookNoJsFallback(result, page, mode, route);
    await assertInternetFeelsDeadLayout(result, page, route);
    await assertCaseReadingTools(result, page, mode, route, viewport);
    await assertHomepageTimeline(result, page, mode, route);
    await assertHomepageVisualOverviews(result, page, mode, route, viewport);
    await assertContactAvailability(result, page, route);
    await assertResponsiveNavigation(result, page, mode, route, viewport);
    await assertMobileAnchorClearance(result, page, route, viewport);

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

  // This reads the generated HTML before Chromium launches, so a missing
  // intrinsic size is caught before the page parser can request the image.
  const results = [assertGeneratedLocalImageDimensions()];
  const browser = await chromium.launch();
  try {
    for (const mode of modes) {
      for (const route of browserRoutes) {
        for (const viewport of contractViewports) {
          results.push(await runCase(browser, mode, route, viewport));
        }
      }
    }

    const noJsMode = modes.find((mode) => mode.name === "no-js");
    if (!noJsMode) throw new Error("Browser contract is missing its no-JavaScript mode.");
    for (const viewport of contractViewports) {
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
        viewports: contractViewports,
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
