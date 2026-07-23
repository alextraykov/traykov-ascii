import { initScramble } from "./scramble.js";
import "./reveal.js";
import "./scroll-fx.js";
import "./count-up.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const rotatorObservers = new Map();
const rotatorTimers = new Map();
const motionMedia = new Set();
const caseVideos = new Set();
let mediaObserver;
let caseVideoObserver;

function stopIdentityRotator(rotator) {
  const state = rotatorTimers.get(rotator);
  if (!state) return;
  window.clearInterval(state.interval);
  window.clearTimeout(state.reverseTimer);
  rotatorTimers.delete(rotator);
}

function startIdentityRotator(rotator) {
  if (rotatorTimers.has(rotator) || reducedMotion.matches) return;

  const words = JSON.parse(rotator.getAttribute("data-words") || "[]");
  if (words.length < 2) return;

  const initialLabel = rotator.textContent?.trim() || words[0];
  rotator.dataset.motionStaticLabel = initialLabel;
  let index = Math.max(0, words.indexOf(initialLabel));
  const state = { interval: 0, reverseTimer: 0 };

  const rotate = () => {
    rotator.classList.remove("is-revealing");
    rotator.classList.add("is-reversing");
    state.reverseTimer = window.setTimeout(() => {
      index = (index + 1) % words.length;
      rotator.textContent = words[index];
      rotator.classList.remove("is-reversing");
      rotator.classList.add("is-revealing");
    }, 260);
  };

  rotator.classList.add("is-revealing");
  state.interval = window.setInterval(rotate, 1800);
  rotatorTimers.set(rotator, state);
}

function freezeIdentityRotator(rotator) {
  stopIdentityRotator(rotator);
  const label = rotator.dataset.motionStaticLabel || rotator.textContent?.trim() || "";
  rotator.dataset.motionStaticLabel = label;
  rotator.classList.remove("is-revealing", "is-reversing");
  if (rotator.textContent !== label) rotator.textContent = label;

  if (rotatorObservers.has(rotator)) return;
  const observer = new MutationObserver(() => {
    if (reducedMotion.matches && rotator.textContent !== label) rotator.textContent = label;
  });
  observer.observe(rotator, { childList: true, characterData: true, subtree: true });
  rotatorObservers.set(rotator, observer);
}

function syncMotionMedia(media) {
  if (!(media instanceof HTMLMediaElement)) return;

  const canPlay =
    !reducedMotion.matches &&
    !document.hidden &&
    document.documentElement.dataset.pageTransitionActive !== "true" &&
    media.dataset.motionVisible === "true";

  if (!canPlay) {
    media.pause();
    return;
  }

  if (!media.src && media.dataset.src) media.src = media.dataset.src;
  media.play().catch(() => {});
}

function initMotionMedia() {
  mediaObserver =
    mediaObserver ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const media = entry.target;
          media.dataset.motionVisible = entry.isIntersecting ? "true" : "false";
          syncMotionMedia(media);
        });
      },
      { rootMargin: "80px 0px", threshold: 0.05 }
    );

  document.querySelectorAll("[data-motion-media]").forEach((media) => {
    if (motionMedia.has(media)) return;
    motionMedia.add(media);
    mediaObserver.observe(media);
  });
}

function syncCaseVideo(media) {
  if (!(media instanceof HTMLMediaElement)) return;

  const isHovered = media.dataset.caseVideoHovered === "true";
  const canPlay =
    !reducedMotion.matches &&
    !document.hidden &&
    document.documentElement.dataset.pageTransitionActive !== "true" &&
    (media.dataset.caseVideoVisible === "true" || isHovered);

  if (!canPlay) {
    media.pause();
    return;
  }

  if (media.ended) media.currentTime = 0;
  media.play().catch(() => {});
}

function initCaseVideos() {
  caseVideoObserver =
    caseVideoObserver ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const media = entry.target;
          media.dataset.caseVideoVisible = entry.intersectionRatio >= 0.6 ? "true" : "false";
          syncCaseVideo(media);
        });
      },
      { threshold: [0, 0.6, 1] }
    );

  document.querySelectorAll("[data-case-video-autoplay]").forEach((media) => {
    if (caseVideos.has(media)) return;
    caseVideos.add(media);
    media.addEventListener("pointerenter", () => {
      media.dataset.caseVideoHovered = "true";
      syncCaseVideo(media);
    });
    media.addEventListener("pointerleave", () => {
      media.dataset.caseVideoHovered = "false";
      syncCaseVideo(media);
    });
    caseVideoObserver.observe(media);
  });
}

function syncReducedMotion() {
  document.querySelectorAll("[data-identity-rotator]").forEach((rotator) => {
    if (reducedMotion.matches) {
      freezeIdentityRotator(rotator);
      return;
    }

    rotatorObservers.get(rotator)?.disconnect();
    rotatorObservers.delete(rotator);
    startIdentityRotator(rotator);
  });

  motionMedia.forEach(syncMotionMedia);
  caseVideos.forEach(syncCaseVideo);
}

function autoDecorateNav() {
  document.querySelectorAll(".site-nav nav a, .case-toc button, .case-sibling-nav a span").forEach((element) => {
    if (element.hasAttribute("data-scramble")) return;
    element.setAttribute("data-scramble", "");
    element.setAttribute("data-scramble-label", element.textContent?.trim() || "");
  });

  initScramble();
  initMotionMedia();
  initCaseVideos();
  syncReducedMotion();
}

reducedMotion.addEventListener("change", syncReducedMotion);
document.addEventListener("visibilitychange", syncReducedMotion);
window.addEventListener("page-transition-state", syncReducedMotion);
window.addEventListener("pagehide", () => {
  document.querySelectorAll("[data-identity-rotator]").forEach(stopIdentityRotator);
  mediaObserver?.disconnect();
  caseVideoObserver?.disconnect();
  window.removeEventListener("page-transition-state", syncReducedMotion);
}, { once: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoDecorateNav, { once: true });
} else {
  autoDecorateNav();
}
