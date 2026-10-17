import { initScramble, scrambleElement } from "./scramble.js";
import { isHistoryRestore, isMotionActive, onMotionChange } from "./lifecycle.js";

let observer;
let pageEnterElements = [];

function shouldOwnPageEnter(element) {
  return (
    element.dataset.revealPageEnter === "true" &&
    !isHistoryRestore() &&
    document.documentElement.dataset.pageEnterConsumed !== "true" &&
    document.documentElement.dataset.transitionIncoming !== "true"
  );
}

function markIn(element, { animate = true } = {}) {
  element.dataset.revealState = "in";

  if (!animate || !isMotionActive() || isHistoryRestore()) return;
  // Arriving through a page transition: the page dissolve is the entrance, so content already in
  // view lands whole instead of snapping in piece by piece. Later scroll reveals still animate.
  if (document.documentElement.dataset.transitionIncoming === "true") return;

  // Round 3: only elements that actually animate get the stepped snap (or band sweep for media).
  element.dataset.revealAnimate = "true";

  if (element.dataset.reveal === "scramble") {
    scrambleElement(element);
  }

  element
    .querySelectorAll('[data-scramble-trigger="reveal"]')
    .forEach((target) => scrambleElement(target));
}

function decorateStandalone(root = document) {
  root.querySelectorAll("[data-motion-standalone] .pave-turntable-stage, [data-motion-standalone] .pave-turntable-controls, [data-motion-standalone] main[data-studio]").forEach((surface) => {
    surface.dataset.reveal = "rise";
    surface.dataset.revealDuration = "340";
    surface.dataset.revealPageEnter = "true";
  });
}

function decorateGroups(root = document) {
  root.querySelectorAll("[data-reveal-group]").forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      if (!child.hasAttribute("data-reveal")) {
        child.dataset.reveal = child.matches("a, article, figure") ? "rise" : "fade";
      }

      if (!child.hasAttribute("data-reveal-delay")) {
        child.dataset.revealDelay = String(Math.min(index, 6) * 60);
      }
    });
  });
}

function prepareElement(element) {
  if (element.dataset.revealPrepared === "true") return;
  element.dataset.revealPrepared = "true";
  if (element.matches("img, video, picture, figure, canvas")) element.dataset.revealMedia = "true";

  const delay = Number(element.dataset.revealDelay || 0);
  if (delay > 0) element.style.setProperty("--reveal-delay", `${delay}ms`);
  const duration = Number(element.dataset.revealDuration || 0);
  if (duration > 0) element.style.setProperty("--reveal-duration", `${duration}ms`);

  if (!isMotionActive() || isHistoryRestore()) {
    markIn(element, { animate: false });
    return;
  }

  if (shouldOwnPageEnter(element)) {
    pageEnterElements.push(element);
    return;
  }

  if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
    markIn(element, { animate: false });
    return;
  }

  observer?.observe(element);
}

function settleReveals() {
  document.querySelectorAll("[data-reveal]").forEach((element) => {
    delete element.dataset.revealAnimate;
    markIn(element, { animate: false });
  });
  observer?.disconnect();
  document.documentElement.dataset.motion = "ready";
}

export function initReveal() {
  pageEnterElements = [];
  decorateStandalone();
  decorateGroups();
  initScramble();

  if (!isMotionActive() || isHistoryRestore()) {
    settleReveals();
    return;
  }

  observer =
    observer ||
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          markIn(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

  document.querySelectorAll("[data-reveal]").forEach((element) => prepareElement(element));
  document.documentElement.dataset.motion = "ready";

  if (pageEnterElements.length) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pageEnterElements.forEach((element) => markIn(element));
      });
    });
  }
}

onMotionChange((state) => {
  if (!state.active || state.historyRestore) settleReveals();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReveal, { once: true });
} else {
  initReveal();
}
