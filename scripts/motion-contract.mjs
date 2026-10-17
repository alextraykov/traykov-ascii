import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4326";
const artifactPath = "/tmp/traykov-print-live-motion-contract.json";
const headed = process.env.MOTION_HEADED === "1";
const result = {
  baseUrl,
  startedAt: new Date().toISOString(),
  execution: {
    browser: "chromium",
    headed,
    note: headed
      ? "Headed mode is available for a real GPU/device profile."
      : "Headless mode may use a static or software-rendered fallback."
  },
  checks: [],
  failures: [],
  performance: {}
};

function record(name, detail) {
  result.checks.push({ name, ...detail });
}

function fail(name, message, detail = {}) {
  result.failures.push({ name, message, ...detail });
}

async function waitFor(page, predicate, timeout = 3_000) {
  try {
    await page.waitForFunction(predicate, undefined, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function rootState(page) {
  return page.evaluate(() => ({
    state: document.documentElement.dataset.motionState || "",
    preference: document.documentElement.dataset.motionPreference || "",
    active: window.__traykovMotion?.isActive?.() ?? null
  }));
}

async function assertToggle(page, expectedState, name) {
  const state = await rootState(page);
  const toggle = await page.locator("[data-motion-toggle]").evaluate((element) => ({
    hidden: element.hidden,
    disabled: element instanceof HTMLButtonElement && element.disabled,
    label: element.getAttribute("aria-label"),
    descriptionId: element.getAttribute("aria-describedby"),
    descriptionText: (() => {
      const id = element.getAttribute("aria-describedby");
      return id ? document.getElementById(id)?.textContent?.trim() || "" : "";
    })(),
    pressed: element.getAttribute("aria-pressed"),
    noun: element.querySelector(".motion-toggle__name")?.textContent?.trim() || "",
    stateText: element.querySelector("[data-motion-toggle-state]")?.textContent?.trim() || "",
    visibleChildren: [...element.children]
      .filter(
        (child) =>
          child instanceof HTMLElement &&
          !child.classList.contains("visually-hidden") &&
          getComputedStyle(child).display !== "none"
      )
      .map((child) => {
        const style = getComputedStyle(child);
        return {
          text: child.textContent?.trim() || "",
          transform: style.transform,
          transitionProperties: style.transitionProperty
        };
      }),
    transitionProperties: getComputedStyle(element).transitionProperty,
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height
  }));
  record(name, { state, toggle });
  if (state.state !== expectedState) fail(name, "Unexpected centralized motion state.", { expectedState, state, toggle });
  if (toggle.hidden || toggle.width < 48 || toggle.height < 48) {
    fail(name, "Motion control is not visible with a 48px hit target.", { toggle });
  }

  const expected = {
    active: {
      disabled: false,
      label: "Motion",
      descriptionText: "Motion is on",
      pressed: "true",
      stateText: "ON"
    },
    visitor: {
      disabled: false,
      label: "Motion",
      descriptionText: "Motion is off",
      pressed: "false",
      stateText: "OFF"
    },
    system: {
      disabled: true,
      label: "Motion",
      descriptionText: "Reduced by system setting",
      pressed: "false",
      stateText: "REDUCED"
    }
  }[expectedState];
  if (
    !expected ||
    toggle.disabled !== expected.disabled ||
    toggle.label !== expected.label ||
    toggle.descriptionId !== "motion-toggle-description" ||
    toggle.descriptionText !== expected.descriptionText ||
    toggle.stateText !== expected.stateText ||
    toggle.pressed !== expected.pressed ||
    toggle.noun !== "MOTION"
  ) {
    fail(name, "Motion control did not expose the expected textual state.", { expected, toggle });
  }
  if (
    toggle.transitionProperties.includes("transform") ||
    toggle.visibleChildren.some(
      (child) => child.transform !== "none" || child.transitionProperties.includes("transform")
    )
  ) {
    fail(name, "Motion control or visible child retained a transform treatment.", { toggle });
  }
  return { state, toggle };
}

async function sampleRaf(page, duration = 650) {
  await page.evaluate(() => window.__motionRafStats?.reset?.());
  await page.waitForTimeout(duration);
  return page.evaluate(() => window.__motionRafStats?.snapshot?.() || null);
}

async function sampleFrameIntervals(page, duration = 700) {
  return page.evaluate(
    (sampleDuration) =>
      new Promise((resolve) => {
        const intervals = [];
        let previous = 0;
        let stopped = false;
        const frame = (time) => {
          if (stopped) return;
          if (previous) intervals.push(time - previous);
          previous = time;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        window.setTimeout(() => {
          stopped = true;
          const sorted = [...intervals].sort((a, b) => a - b);
          const average = intervals.length
            ? intervals.reduce((total, value) => total + value, 0) / intervals.length
            : null;
          resolve({
            sampledBy: "test-owned-rAF",
            samples: intervals.length,
            averageMs: average,
            p95Ms: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null,
            maxMs: sorted.length ? sorted.at(-1) : null,
            limitation: "This measures browser frame delivery, not application callbacks or a 60fps claim."
          });
        }, sampleDuration);
      }),
    duration
  );
}

async function settleRoute(page, duration = 760) {
  await page.waitForTimeout(duration);
}

async function moveSurfaceOffscreen(page, selector) {
  return page.evaluate(async (targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) return { found: false, offscreen: false };

    const html = document.documentElement;
    const body = document.body;
    const htmlValue = html.style.getPropertyValue("scroll-behavior");
    const htmlPriority = html.style.getPropertyPriority("scroll-behavior");
    const bodyValue = body.style.getPropertyValue("scroll-behavior");
    const bodyPriority = body.style.getPropertyPriority("scroll-behavior");
    html.style.setProperty("scroll-behavior", "auto", "important");
    body.style.setProperty("scroll-behavior", "auto", "important");
    window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: "auto" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = target.getBoundingClientRect();
    const detail = {
      found: true,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight: window.innerHeight,
      offscreen: rect.bottom <= 0 || rect.top >= window.innerHeight
    };
    if (htmlValue) html.style.setProperty("scroll-behavior", htmlValue, htmlPriority);
    else html.style.removeProperty("scroll-behavior");
    if (bodyValue) body.style.setProperty("scroll-behavior", bodyValue, bodyPriority);
    else body.style.removeProperty("scroll-behavior");
    return detail;
  }, selector);
}

async function installPseudoAnimationProbe(page) {
  return page.evaluate(() => {
    let probe = document.querySelector("[data-motion-pseudo-probe]");
    if (!(probe instanceof HTMLElement)) {
      const style = document.createElement("style");
      style.dataset.motionPseudoProbe = "true";
      style.textContent = "@keyframes motion-contract-probe { to { opacity: .5; } } [data-motion-pseudo-probe]::before { content: ''; animation: motion-contract-probe 1s linear infinite; }";
      probe = document.createElement("span");
      probe.dataset.motionPseudoProbe = "true";
      probe.setAttribute("aria-hidden", "true");
      document.body.append(style, probe);
    }
    return getComputedStyle(probe, "::before").animationPlayState;
  });
}

async function visitInteractiveRoutes(page) {
  const routes = [
    { path: "/labs/ascii-banner/", selector: "[data-ascii-banner-studio]", stage: "[data-ascii-banner-stage]" },
    { path: "/labs/product-systems-kit/", selector: "[data-product-systems-kit]", stage: ".product-kit__stage" },
    { path: "/labs/rhizome-field/", selector: "[data-rhizome-field]", stage: "[data-rhizome-stage]" },
    { path: "/labs/sketchbook/", selector: "[data-creative-sketchbook]", stage: "[data-sketch-stage]" },
    { path: "/image-trail/", selector: "[data-dither-trail]", stage: "[data-dither-trail-field]" },
    { path: "/notes/on-digital-art/", selector: "[data-blocktype-wave-preview]", stage: "[data-blocktype-wave-preview] canvas" },
    { path: "/obj-turntable/", selector: "[data-obj-turntable]", stage: "[data-obj-turntable]" },
    { path: "/pave-turntable/", selector: "[data-pave-turntable]", stage: "[data-pave-turntable]" },
    { path: "/sasi-turntable/", selector: "[data-sasi-logo-turntable]", stage: "[data-sasi-logo-turntable]" },
    { path: "/synapse-turntable/", selector: "[data-sasi-logo-turntable]", stage: "[data-sasi-logo-turntable]" },
    { path: "/playground/", selector: "[data-ascii-playground]", stage: ".playground-stage" },
    { path: "/svg-ascii-studio/", selector: "[data-studio]", stage: "[data-stage]" }
  ];

  const inspected = [];
  for (const route of routes) {
    const { path, selector, stage } = route;
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await settleRoute(page);
    const found = await page.locator(selector).count();
    const state = await rootState(page);
    if (["/obj-turntable/", "/pave-turntable/", "/sasi-turntable/", "/synapse-turntable/", "/svg-ascii-studio/"].includes(path)) {
      const owners = await page.locator('[data-motion-standalone] [data-reveal-page-enter="true"]').count();
      if (owners !== (path === "/svg-ascii-studio/" ? 1 : 2)) fail("standalone-entrance-owner", "Standalone entrance ownership missing.", { path, owners });
    }
    await page.locator("[data-motion-toggle]").click();
    await waitFor(page, () => document.documentElement.dataset.motionState === "visitor");
    const pausedRaf = await sampleRaf(page, 320);
    await page.locator("[data-motion-toggle]").click();
    await waitFor(page, () => document.documentElement.dataset.motionState === "active");
    await page.waitForTimeout(120);
    const offscreen = await moveSurfaceOffscreen(page, stage);
    await page.waitForTimeout(180);
    const offscreenRaf = offscreen.offscreen ? await sampleRaf(page, 320) : null;
    inspected.push({
      path,
      selector,
      stage,
      found,
      state,
      pausedRaf,
      offscreen: {
        ...offscreen,
        status: offscreen.offscreen ? "asserted" : "not-applicable",
        limitation: offscreen.offscreen
          ? undefined
          : "This standalone surface remains viewport-locked at the end of its route, so the browser run cannot observe a natural offscreen state."
      },
      offscreenRaf
    });
    if (found !== 1) fail("standalone-route", "Interactive surface did not mount exactly once.", { path, selector, found });
    if (state.state !== "active") fail("standalone-route", "Interactive route did not inherit active motion.", { path, state });
    if (pausedRaf && pausedRaf.callbacks > 4) {
      fail("standalone-paused-raf", "An interactive surface kept rendering after global pause.", { path, pausedRaf });
    }
    if (offscreen.offscreen && offscreenRaf && offscreenRaf.callbacks > 4) {
      fail("standalone-offscreen-raf", "An inactive surface kept rendering offscreen.", { path, offscreenRaf });
    }
  }
  record("standalone-route-coverage", { inspected });
}

async function verifyPausedControls(page) {
  const routes = [
    ["/pave-turntable/", "pave", "[data-pave-turntable]", ["renderSize", "depth", "bevel"]],
    ["/obj-turntable/", "obj", "[data-obj-turntable]", ["renderSize", "density"]],
    ["/sasi-turntable/", "sasi", "[data-sasi-logo-turntable]", ["renderSize", "depth", "bevel"]]
  ];
  for (const [path, prefix, stage, controls] of routes) {
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });
    if ((await rootState(page)).state === "active") await page.locator("[data-motion-toggle]").click();
    await settleRoute(page);
    const gpu = await page.locator(stage).evaluate((element) => element.classList.contains("has-webgl"));
    if (!gpu) {
      record("paused-control-gpu-unavailable", { path, status: "not-asserted" });
      continue;
    }
    for (const name of controls) {
      const input = page.locator(`[data-${prefix}-control="${name}"]`);
      const ascii = page.locator(`[data-${prefix}-ascii]`);
      const beforeValue = await input.inputValue();
      const beforeFrame = await ascii.textContent();
      await input.focus();
      for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      const afterValue = await input.inputValue();
      const frameChanged = beforeFrame !== await ascii.textContent();
      await page.waitForTimeout(100);
      const idle = await sampleRaf(page, 200);
      const detail = { path, control: name, beforeValue, afterValue, frameChanged, idle };
      record("paused-native-control-frame", detail);
      if (beforeValue === afterValue || !frameChanged || idle.callbacks > 1) {
        fail("paused-native-control-frame", "Explicit control did not produce a static frame and settle.", detail);
      }
    }
  }
  await page.locator("[data-motion-toggle]").click();
}

async function verifyReadingMotion(page) {
  for (const path of ["/case-studies/designing-pave/", "/notes/on-digital-art/"]) {
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });
    const headings = page.locator("[data-motion-section-scan]");
    const count = await headings.count();
    const figures = await page.locator(".case-study-body figure[data-reveal], .note-body figure[data-reveal], .note-page article > figure[data-reveal]").count();
    const availableHeadings = await page.locator(".case-study-body h2, .case-study-body h3, .note-body h2, .note-body h3").count();
    if (count) await headings.last().scrollIntoViewIfNeeded();
    const stable = await headings.evaluateAll((elements) => elements.every((element) => {
      const style = getComputedStyle(element);
      return style.opacity === "1" && style.transform === "none" && getComputedStyle(element, "::after").content === '\"\"';
    }));
    record("reading-motion", { path, count, figures, stable });
    if (count !== availableHeadings || !figures || !stable) fail("reading-motion", "Reading boundaries/figures are missing or heading text moved.", { path, count, availableHeadings, figures, stable });
  }
}

async function verifyBackForwardCache() {
  const browser = await chromium.launch({ headless: !headed, ignoreDefaultArgs: ["--disable-back-forward-cache"] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      window.__motionPersisted = false;
      window.addEventListener("pageshow", (event) => { window.__motionPersisted = event.persisted; });
    });
    const page = await context.newPage();
    await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle" });
    await page.goto(new URL("/about/", baseUrl).toString(), { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "commit" });
    await page.waitForTimeout(80);
    const detail = await page.evaluate(() => ({
      persisted: window.__motionPersisted,
      restored: window.__traykovMotion?.isHistoryRestore?.(),
      label: document.querySelector(".about-title__prefix [data-scramble-visual]")?.textContent,
      scans: document.querySelectorAll('[data-motion-artwork-scan="true"]').length,
      hidden: [...document.querySelectorAll("[data-reveal]")].filter((element) => getComputedStyle(element).opacity === "0").length
    }));
    record("bfcache-restoration", { ...detail, status: detail.persisted ? "asserted" : "not-available" });
    if (!detail.restored || detail.label !== "Alexander Traykov" || detail.scans || detail.hidden) {
      fail("bfcache-restoration", "History content or subordinate entrances failed to settle.", detail);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "no-preference"
  });
  await context.addInitScript(() => {
    window.__motionPageShows = [];
    window.addEventListener("pageshow", (event) => window.__motionPageShows.push(event.persisted));
    const original = window.requestAnimationFrame.bind(window);
    const originalCancel = window.cancelAnimationFrame.bind(window);
    let scheduled = 0;
    let callbacks = 0;
    let cancelled = 0;
    window.requestAnimationFrame = (callback) => {
      scheduled += 1;
      return original((time) => {
        callbacks += 1;
        callback(time);
      });
    };
    window.cancelAnimationFrame = (handle) => {
      cancelled += 1;
      return originalCancel(handle);
    };
    window.__motionRafStats = {
      reset() {
        scheduled = 0;
        callbacks = 0;
        cancelled = 0;
      },
      snapshot() {
        return { scheduled, callbacks, cancelled };
      }
    };
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack, url: page.url() }));

  try {
    await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle" });
    const heroReady = await waitFor(page, () => document.querySelector("#hero-title")?.closest("[data-reveal]")?.dataset.revealState === "in");
    record("home-opening", {
      heroReady,
      hero: await page.locator("#hero-title").evaluate((element) => ({
        opacity: getComputedStyle(element.closest("[data-reveal]"))?.opacity,
        state: element.closest("[data-reveal]")?.dataset.revealState || ""
      }))
    });
    if (!heroReady) fail("home-opening", "The page-owned hero entrance did not settle.");

    await assertToggle(page, "active", "home-toggle-active");
    const activeRaf = await sampleRaf(page);
    result.performance.activeHomeRaf = activeRaf;
    const homeRuntime = await page.evaluate(() => ({
      webglPortrait: document.querySelector(".about-turntable")?.classList.contains("has-webgl") || false,
      videos: [...document.querySelectorAll("[data-overview-video-media]")].map((video) => ({
        paused: video instanceof HTMLVideoElement ? video.paused : null,
        readyState: video instanceof HTMLVideoElement ? video.readyState : null,
        currentTime: video instanceof HTMLVideoElement ? video.currentTime : null
      }))
    }));
    const homeFrameIntervals = await sampleFrameIntervals(page);
    result.performance.homeProfile = {
      runtime: homeRuntime,
      appRaf: activeRaf,
      frameIntervals: homeFrameIntervals,
      limitation:
        activeRaf?.callbacks
          ? "Application callback activity was observed; use headed mode for device-specific GPU profiling."
          : "No application callbacks were observed in this headless sample, so it is not a smoothness result."
    };

    const video = page.locator('[data-project-overview="designing-pave"] [data-overview-video-media]').first();
    const videoToggle = page.locator('[data-project-overview="designing-pave"] [data-overview-video-toggle]').first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(160);
    await videoToggle.click();
    const manualPause = await video.evaluate((element) => element instanceof HTMLVideoElement && element.paused);

    const motionToggle = page.locator("[data-motion-toggle]");
    await motionToggle.click();
    await waitFor(page, () => document.documentElement.dataset.motionState === "visitor");
    const paused = await assertToggle(page, "visitor", "home-toggle-paused");
    const pseudoAnimationState = await installPseudoAnimationProbe(page);
    const videosPaused = await page.locator("[data-overview-video-media]").evaluateAll((videos) =>
      videos.every((video) => video instanceof HTMLVideoElement && video.paused)
    );
    const idleRaf = await sampleRaf(page);
    result.performance.pausedHomeRaf = idleRaf;
    record("pause-settles-media-and-work", {
      manualPause,
      videosPaused,
      idleRaf,
      stateText: paused.toggle.stateText,
      pseudoAnimationState
    });
    if (!manualPause || !videosPaused || paused.toggle.stateText !== "OFF" || pseudoAnimationState !== "paused") {
      fail("pause-settles-media-and-work", "Pause did not settle media, pseudo-elements, or expose the OFF state.", {
        manualPause,
        videosPaused,
        paused,
        pseudoAnimationState
      });
    }
    if (idleRaf && idleRaf.callbacks > 4) {
      fail("pause-idle-raf", "Decorative animation continued to schedule callbacks while paused.", { idleRaf });
    }

    await page.goto(new URL("/notes/", baseUrl).toString(), { waitUntil: "networkidle" });
    const persistedPause = await assertToggle(page, "visitor", "pause-persists-across-routes");
    if (
      persistedPause.toggle.label !== "Motion" ||
      persistedPause.toggle.descriptionText !== "Motion is off" ||
      persistedPause.toggle.pressed !== "false" ||
      persistedPause.toggle.stateText !== "OFF"
    ) {
      fail("pause-persists-across-routes", "Persistent toggle did not retain its OFF state and description.", { persistedPause });
    }
    await page.locator("[data-motion-toggle]").click();
    await waitFor(page, () => document.documentElement.dataset.motionState === "active");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await waitFor(page, () => document.documentElement.dataset.motionState === "system");
    const reduced = await assertToggle(page, "system", "dynamic-system-reduced-motion");
    const reducedReveals = await page.locator("[data-reveal]").evaluateAll((elements) =>
      elements.every((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.opacity || "1") > 0.99 && style.visibility !== "hidden";
      })
    );
    record("reduced-rest-state", { reducedReveals, disabled: reduced.toggle.disabled });
    if (!reduced.toggle.disabled || !reducedReveals) {
      fail("reduced-rest-state", "System reduced motion did not settle controls and reveals.", { reduced, reducedReveals });
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await waitFor(page, () => document.documentElement.dataset.motionState === "active");

    await page.goto(new URL("/labs/", baseUrl).toString(), { waitUntil: "networkidle" });
    const artwork = page.locator("[data-motion-artwork]").first();
    await artwork.scrollIntoViewIfNeeded();
    const box = await artwork.boundingBox();
    if (!box) {
      fail("pointer-artwork", "Labs artwork did not produce a measurable pointer target.");
    } else {
      for (let index = 0; index < 8; index += 1) {
        await page.mouse.move(box.x + 8 + index * Math.min(18, box.width / 10), box.y + box.height / 2);
      }
      await page.waitForTimeout(40);
      const tracking = await artwork.evaluate((element) => {
        const inner = element.querySelector("[data-motion-artwork-inner]");
        const transform = inner instanceof HTMLElement ? inner.style.transform : "";
        const matches = transform.match(/translate3d\(([-.\d]+)px,\s*([-.\d]+)px/);
        return { transform, x: Number(matches?.[1] || 0), y: Number(matches?.[2] || 0) };
      });
      await artwork.dispatchEvent("pointerleave");
      await page.waitForTimeout(220);
      const settled = await artwork.evaluate((element) => {
        const inner = element.querySelector("[data-motion-artwork-inner]");
        return inner instanceof HTMLElement ? inner.style.transform : "";
      });
      record("bounded-artwork-pointer", { tracking, settled });
      if (Math.abs(tracking.x) > 6.01 || Math.abs(tracking.y) > 6.01 || settled) {
        fail("bounded-artwork-pointer", "Artwork pointer response exceeded its bound or did not settle.", { tracking, settled });
      }
    }

    await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle" });
    const projectTitle = page.locator('[data-project-overview="synapse-sys"] [data-project-overview-title] a').first();
    await projectTitle.scrollIntoViewIfNeeded();
    await projectTitle.click();
    await page.waitForURL(/\/case-studies\/synapse-sys\//);
    const transitionState = await page.evaluate(() => {
      const main = document.querySelector("main");
      return {
        transport: document.documentElement.dataset.transitionTransport || "",
        arriving: document.body.classList.contains("is-page-arriving"),
        mainAnimation: main ? getComputedStyle(main).animationName : "",
        activeAnimations: document.getAnimations().map((animation) => animation.animationName || "").filter(Boolean)
      };
    });
    record("project-title-continuity", transitionState);
    if (!transitionState.transport && !transitionState.mainAnimation) {
      fail("project-title-continuity", "Project title navigation did not expose an incoming transition state.", transitionState);
    }
    if (transitionState.transport === "fallback" && !transitionState.mainAnimation.includes("motion-editorial-in")) {
      fail("project-title-continuity", "Fallback editorial navigation did not animate its incoming page.", transitionState);
    }
    await page.goBack({ waitUntil: "networkidle" });
    const historyVisible = await waitFor(page, () => {
      const hero = document.querySelector("#hero-title")?.closest("[data-reveal]");
      return hero instanceof HTMLElement && getComputedStyle(hero).opacity !== "0";
    });
    record("history-restoration", { historyVisible, navigationType: await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type || "") });
    if (!historyVisible) fail("history-restoration", "Back navigation left page-enter content hidden.");
    const subordinateHistory = await page.evaluate(() => ({
      restored: window.__traykovMotion?.isHistoryRestore?.(),
      persistedPageShow: window.__motionPageShows?.includes(true),
      label: document.querySelector(".about-title__prefix [data-scramble-visual]")?.textContent,
      activeScans: document.querySelectorAll('[data-motion-artwork-scan="true"]').length
    }));
    record("history-subordinate-entrances", subordinateHistory);
    if (!subordinateHistory.restored || subordinateHistory.label !== "Alexander Traykov" || subordinateHistory.activeScans) {
      fail("history-subordinate-entrances", "History restoration replayed subordinate entrances.", subordinateHistory);
    }


    await visitInteractiveRoutes(page);
    await verifyReadingMotion(page);
    await verifyPausedControls(page);

    await page.goto(new URL("/pave-turntable/", baseUrl).toString(), { waitUntil: "networkidle" });
    await page.locator("[data-motion-toggle]").click();
    await waitFor(page, () => document.documentElement.dataset.motionState === "visitor");
    const size = page.locator('[data-pave-control="renderSize"]');
    const turntable = page.locator("[data-pave-turntable]");
    const gpuAvailable = await turntable.evaluate((element) => element.classList.contains("has-webgl"));
    const ascii = page.locator("[data-pave-ascii]");
    const before = await page.locator('[data-pave-output="renderSize"]').textContent();
    const beforeAscii = gpuAvailable ? await ascii.textContent() : "";
    const controlEnabled = await size.isEnabled();
    if (gpuAvailable && controlEnabled) {
      await size.focus();
      for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(220);
    }
    const after = await page.locator('[data-pave-output="renderSize"]').textContent();
    const afterAscii = gpuAvailable ? await ascii.textContent() : "";
    record("paused-turntable-static-controls", {
      before,
      after,
      gpuAvailable,
      controlEnabled,
      asciiFrameChanged: gpuAvailable ? beforeAscii !== afterAscii : null,
      limitation: gpuAvailable
        ? undefined
        : "Headless fallback did not initialize Pave WebGL; static-frame control parity requires headed GPU evidence."
    });
    if (gpuAvailable && (!controlEnabled || before === after)) {
      fail("paused-turntable-static-controls", "Paused GPU turntable did not apply an explicit control update.", {
        before,
        after,
        controlEnabled
      });
    }
    if (gpuAvailable && beforeAscii === afterAscii) {
      fail("paused-turntable-static-frame", "Paused GPU turntable did not update its ASCII frame after explicit input.", { sameFrame: beforeAscii === afterAscii });
    }

    const foreground = await context.newPage();
    await foreground.goto(new URL("/about/", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await foreground.bringToFront();
    await page.waitForTimeout(120);
    let hiddenState = await rootState(page);
    let hiddenMethod = "second-tab";
    let hiddenLimit = "";
    if (hiddenState.state !== "hidden") {
      const cdp = await context.newCDPSession(page);
      try {
        await cdp.send("Emulation.setPageVisibilityState", { visibilityState: "hidden" });
        await waitFor(page, () => document.documentElement.dataset.motionState === "hidden");
        hiddenState = await rootState(page);
        hiddenMethod = "cdp";
        await cdp.send("Emulation.setPageVisibilityState", { visibilityState: "visible" });
      } catch (error) {
        hiddenLimit = error instanceof Error ? error.message : String(error);
      } finally {
        await cdp.detach();
      }
    }
    result.performance.hiddenPaveRaf = hiddenState.state === "hidden" ? await sampleRaf(page, 300) : null;
    await page.bringToFront();
    await waitFor(page, () => document.documentElement.dataset.motionState === "visitor");
    record("document-hidden-lifecycle", {
      method: hiddenMethod,
      hiddenObserved: hiddenState.state === "hidden",
      hiddenPaveRaf: result.performance.hiddenPaveRaf,
      status: hiddenState.state === "hidden" ? "asserted" : "not-asserted",
      limitation:
        hiddenLimit ||
        (hiddenState.state !== "hidden"
          ? "This Chromium environment did not hide a background tab; no synthetic hidden-state pass was claimed."
          : undefined)
    });
    if (hiddenState.state === "hidden" && result.performance.hiddenPaveRaf?.callbacks > 4) {
      fail("document-hidden-raf", "The Pave renderer continued to schedule frames while its document was hidden.", {
        hiddenPaveRaf: result.performance.hiddenPaveRaf
      });
    }
    await foreground.close();
  } finally {
    result.pageErrors = pageErrors;
    result.finishedAt = new Date().toISOString();
    writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
    await context.close();
    await browser.close();
  }

  await verifyBackForwardCache();
  if (pageErrors.length) fail("page-errors", "Browser emitted uncaught page errors.", { pageErrors });
  result.finishedAt = new Date().toISOString();
  writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
  if (result.failures.length) process.exitCode = 1;
  console.log(JSON.stringify({ artifactPath, failures: result.failures.length, checks: result.checks.length, performance: result.performance }, null, 2));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  fail("motion-contract-exception", message);
  result.finishedAt = new Date().toISOString();
  writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
  console.error(message);
  process.exitCode = 1;
}
