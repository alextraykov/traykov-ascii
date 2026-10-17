export const SCRAMBLE_RAMP = " .:+*#%@";

import { isHistoryRestore, isMotionActive, onMotionChange } from "./lifecycle.js";

const activeFrames = new WeakMap();
const activeElements = new Set();

function getVisualTarget(element) {
  if (!(element instanceof HTMLElement)) return element;
  return element.querySelector(":scope > [data-scramble-visual]") || element;
}

function getDuration(element, fallback = 260) {
  const explicitDuration = Number(element.dataset.scrambleDuration);
  if (Number.isFinite(explicitDuration) && explicitDuration >= 0) return explicitDuration;

  const token = getComputedStyle(document.documentElement).getPropertyValue("--dur-3").trim();
  if (token.endsWith("ms")) return Number.parseFloat(token) || fallback;
  if (token.endsWith("s")) {
    const seconds = Number.parseFloat(token);
    return Number.isFinite(seconds) ? seconds * 1000 : fallback;
  }
  return fallback;
}

export function getScrambleLabel(element) {
  const target = getVisualTarget(element);
  const label =
    target.dataset.scrambleLabel ||
    element.dataset.scrambleLabel ||
    target.dataset.scrambleSource ||
    element.dataset.scrambleSource ||
    target.dataset.scramble ||
    element.dataset.scramble ||
    target.textContent ||
    element.textContent ||
    "";

  target.dataset.scrambleLabel = label;
  element.dataset.scrambleLabel = label;
  return label;
}

export function scrambleElement(element, options = {}) {
  const target = getVisualTarget(element);
  const label = getScrambleLabel(target);
  const duration = Number(options.duration ?? getDuration(target));
  const reverse = Boolean(options.reverse);

  if (!isMotionActive() || duration <= 0) {
    target.textContent = label;
    return Promise.resolve();
  }

  const chars = Array.from(label);
  const token = (activeFrames.get(target) || 0) + 1;
  const start = performance.now();
  activeFrames.set(target, token);
  activeElements.add(target);

  return new Promise((resolve) => {
    const tick = (now) => {
      if (activeFrames.get(target) !== token) {
        activeElements.delete(target);
        resolve();
        return;
      }

      const progress = Math.min(1, (now - start) / duration);
      const resolved = Math.floor(chars.length * progress);

      target.textContent = chars
        .map((character, index) => {
          if (character === " ") return " ";
          const order = reverse ? chars.length - index - 1 : index;
          if (order < resolved || progress === 1) return character;
          const rampIndex = 1 + Math.floor(Math.random() * (SCRAMBLE_RAMP.length - 1));
          return SCRAMBLE_RAMP[rampIndex];
        })
        .join("");

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        target.textContent = label;
        activeElements.delete(target);
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}

export function settleScramble(element) {
  const target = getVisualTarget(element);
  const token = (activeFrames.get(target) || 0) + 1;
  activeFrames.set(target, token);
  target.textContent = getScrambleLabel(target);
  activeElements.delete(target);
}

function installStableLabel(element) {
  if (
    !(element instanceof HTMLElement) ||
    element.dataset.scrambleAccessible === "true" ||
    element.matches("[data-identity-rotator], [data-identity-prefix]")
  ) {
    return;
  }

  const label = getScrambleLabel(element);
  const visual = document.createElement("span");
  visual.dataset.scrambleVisual = "true";
  visual.dataset.scrambleLabel = label;
  visual.setAttribute("aria-hidden", "true");
  visual.textContent = label;
  const stable = document.createElement("span");
  stable.className = "visually-hidden";
  stable.textContent = label;

  element.replaceChildren(visual, stable);
  element.dataset.scrambleAccessible = "true";
}

export function prepareScrambleElement(element) {
  installStableLabel(element);
  getScrambleLabel(element);

  if (element.dataset.scrambleReady === "true") return;
  element.dataset.scrambleReady = "true";

  const trigger = element.dataset.scrambleTrigger || "hover";
  const host = element.closest("a, button, summary, [tabindex]") || element;

  const visual = getVisualTarget(element);

  if (trigger === "load") {
    if (isHistoryRestore()) settleScramble(visual);
    else scrambleElement(visual);
    return;
  }

  if (trigger === "reveal") return;

  host.addEventListener("pointerenter", () => scrambleElement(visual));
  host.addEventListener("focus", () => scrambleElement(visual));
  host.addEventListener("pointerleave", () => {
    settleScramble(visual);
  });
}

export function initScramble(root = document) {
  root
    .querySelectorAll("[data-scramble], [data-footer-scramble]")
    .forEach((element) => prepareScrambleElement(element));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initScramble(), { once: true });
} else {
  initScramble();
}

onMotionChange((state) => {
  if (state.active && !state.historyRestore) return;
  activeElements.forEach((element) => settleScramble(element));
  document.querySelectorAll("[data-scramble], [data-footer-scramble]").forEach((element) => {
    if (element instanceof HTMLElement) settleScramble(element);
  });
});
