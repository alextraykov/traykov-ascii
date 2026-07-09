export const SCRAMBLE_RAMP = " .:+*#%@";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const activeFrames = new WeakMap();

export function getScrambleLabel(element) {
  const label =
    element.dataset.scrambleLabel ||
    element.dataset.scrambleSource ||
    element.dataset.scramble ||
    element.textContent ||
    "";

  element.dataset.scrambleLabel = label;
  return label;
}

export function scrambleElement(element, options = {}) {
  const label = getScrambleLabel(element);
  const duration = Number(options.duration ?? element.dataset.scrambleDuration ?? 420);
  const reverse = Boolean(options.reverse);

  if (reducedMotion.matches || duration <= 0) {
    element.textContent = label;
    return Promise.resolve();
  }

  const chars = Array.from(label);
  const token = (activeFrames.get(element) || 0) + 1;
  const start = performance.now();
  activeFrames.set(element, token);

  return new Promise((resolve) => {
    const tick = (now) => {
      if (activeFrames.get(element) !== token) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - start) / duration);
      const resolved = Math.floor(chars.length * progress);

      element.textContent = chars
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
        element.textContent = label;
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}

export function prepareScrambleElement(element) {
  getScrambleLabel(element);

  if (element.dataset.scrambleReady === "true") return;
  element.dataset.scrambleReady = "true";

  const trigger = element.dataset.scrambleTrigger || "hover";
  const host = element.closest("a, button, summary, [tabindex]") || element;

  if (trigger === "load") {
    scrambleElement(element);
    return;
  }

  if (trigger === "reveal") return;

  host.addEventListener("pointerenter", () => scrambleElement(element));
  host.addEventListener("focus", () => scrambleElement(element));
  host.addEventListener("pointerleave", () => {
    const token = (activeFrames.get(element) || 0) + 1;
    activeFrames.set(element, token);
    element.textContent = getScrambleLabel(element);
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
