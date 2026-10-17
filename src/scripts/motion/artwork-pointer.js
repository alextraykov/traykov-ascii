import { createMotionEligibility, isHistoryRestore, isMotionActive } from "./lifecycle.js";

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const MAX_OFFSET = 6;
const initialized = new WeakSet();

function createInner(root) {
  const existing = root.querySelector(":scope > [data-motion-artwork-inner]");
  if (existing instanceof HTMLElement) return existing;

  const inner = document.createElement("div");
  inner.className = "motion-artwork__inner";
  inner.dataset.motionArtworkInner = "true";
  Array.from(root.children).forEach((child) => inner.append(child));
  root.append(inner);
  return inner;
}

function initializeArtwork(root) {
  if (!(root instanceof HTMLElement) || initialized.has(root)) return;
  initialized.add(root);

  const inner = createInner(root);
  const scan = document.createElement("span");
  scan.className = "motion-artwork__scan";
  scan.setAttribute("aria-hidden", "true");
  root.append(scan);

  let frame = 0;
  let nextX = 0;
  let nextY = 0;
  let scanned = isHistoryRestore();

  const renderPointer = () => {
    frame = 0;
    if (!isMotionActive() || !finePointer.matches) return;
    inner.dataset.motionArtworkTracking = "true";
    inner.style.willChange = "transform";
    inner.style.transform = `translate3d(${nextX.toFixed(2)}px, ${nextY.toFixed(2)}px, 0)`;
  };

  const queuePointer = () => {
    if (!frame) frame = window.requestAnimationFrame(renderPointer);
  };

  const resetPointer = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    nextX = 0;
    nextY = 0;
    delete inner.dataset.motionArtworkTracking;
    inner.style.removeProperty("transform");
    inner.style.removeProperty("will-change");
  };

  root.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || !isMotionActive()) return;
    const bounds = root.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    nextX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, ((event.clientX - bounds.left) / bounds.width - 0.5) * MAX_OFFSET * 2));
    nextY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, ((event.clientY - bounds.top) / bounds.height - 0.5) * MAX_OFFSET * 2));
    queuePointer();
  }, { passive: true });

  root.addEventListener("pointerleave", resetPointer, { passive: true });
  scan.addEventListener("animationend", () => {
    delete root.dataset.motionArtworkScan;
  });

  const childObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node === inner || node === scan || !(node instanceof HTMLElement)) return;
        inner.append(node);
      });
    });
  });
  childObserver.observe(root, { childList: true });

  const cleanupEligibility = createMotionEligibility(root, (eligible) => {
    if (isHistoryRestore()) {
      scanned = true;
      delete root.dataset.motionArtworkScan;
    }
    if (!eligible) {
      resetPointer();
      delete root.dataset.motionArtworkScan;
      return;
    }
    if (scanned) return;
    scanned = true;
    root.dataset.motionArtworkScan = "true";
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

  window.addEventListener("pagehide", (event) => {
    resetPointer();
    delete root.dataset.motionArtworkScan;
    if (!event.persisted) {
      childObserver.disconnect();
      cleanupEligibility();
    }
  });
}

export function initializeArtworkPointers(root = document) {
  root
    .querySelectorAll("[data-motion-artwork], .about-turntable, .case-hero-turntable")
    .forEach(initializeArtwork);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initializeArtworkPointers(), { once: true });
} else {
  initializeArtworkPointers();
}
