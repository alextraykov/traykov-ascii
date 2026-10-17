// Case-study switches (before/after, live states, gallery themes) and lazy prototype iframes.
// Server markup is complete without JS: every panel is visible and switches stay hidden.

import { isMotionActive } from "./motion/lifecycle.js";

function pressOnly(group, active) {
  group.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button === active));
  });
}

function initCompare(figure) {
  const group = figure.querySelector("[data-case-compare-switch]");
  if (!group) return;
  const panels = [...figure.querySelectorAll("[data-case-compare-panel]")];

  const show = (index) => {
    panels.forEach((panel) => {
      const active = panel.dataset.caseComparePanel === index;
      panel.dataset.active = String(active);
      panel.toggleAttribute("inert", !active);
      const video = panel.querySelector("video");
      if (!video) return;
      if (!active) video.pause();
      else if (video.dataset.caseVideoVisible === "true" && isMotionActive()) video.play().catch(() => {});
    });
  };

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-compare-option]");
    if (!button) return;
    pressOnly(group, button);
    show(button.dataset.caseCompareOption);
  });

  group.hidden = false;
  figure.dataset.caseCompareReady = "true";
  show("0");
}

const liveFrames = new Set();
let liveObserver;

function loadFrame(frame, load) {
  const next = load ? frame.dataset.caseLiveSrc : "about:blank";
  if (frame.getAttribute("src") === next) return;
  if (!load && !frame.getAttribute("src")) return;
  frame.setAttribute("src", next);
  frame.closest(".case-live__frame")?.toggleAttribute("data-loaded", load);
}

function initLiveFrame(frame) {
  if (liveFrames.has(frame)) return;
  liveFrames.add(frame);
  frame.addEventListener("load", () => {
    if (frame.getAttribute("src") !== "about:blank") frame.removeAttribute("tabindex");
  });
  liveObserver =
    liveObserver ||
    new IntersectionObserver(
      (entries) => entries.forEach((entry) => loadFrame(entry.target, entry.isIntersecting)),
      { rootMargin: "600px 0px" }
    );
  liveObserver.observe(frame);
}

function initLiveSwitcher(figure) {
  const group = figure.querySelector("[data-case-live-switch]");
  const frame = figure.querySelector("iframe[data-case-live-src]");
  if (!group || !frame) return;
  const base = figure.dataset.caseLiveBase ?? "";
  const open = figure.querySelector("[data-case-live-open]");
  const current = figure.querySelector("[data-case-live-current]");

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-live-value]");
    if (!button) return;
    pressOnly(group, button);
    const src = base + button.dataset.caseLiveValue;
    frame.dataset.caseLiveSrc = src;
    if (frame.getAttribute("src") && frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", src);
    if (open) open.href = src;
    if (current) {
      const tag = button.dataset.caseLiveTag ?? "";
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      current.innerHTML = tag ? `<span class="case-tag case-tag--${slug}"></span>` : "";
      current.firstElementChild?.append(tag);
    }
  });

  group.hidden = false;
  figure.querySelector("[data-case-live-fallback-list]")?.setAttribute("hidden", "");
}

function initGallery(figure) {
  const group = figure.querySelector("[data-case-gallery-switch]");
  if (!group) return;

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-gallery-theme]");
    if (!button) return;
    pressOnly(group, button);
    const theme = button.dataset.caseGalleryTheme;
    figure.dataset.caseGalleryActive = theme;
    figure.querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute(`data-case-gallery-${theme}`);
      if (src) image.src = src;
    });
  });

  group.hidden = false;
}

export function initCaseMedia(root = document) {
  root.querySelectorAll("[data-case-compare]").forEach(initCompare);
  root.querySelectorAll("iframe[data-case-live-src]").forEach(initLiveFrame);
  root.querySelectorAll(".case-live--switcher").forEach(initLiveSwitcher);
  root.querySelectorAll("[data-case-gallery]").forEach(initGallery);
}

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  liveObserver?.disconnect();
});
