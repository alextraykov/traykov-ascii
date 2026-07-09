import { SCRAMBLE_RAMP } from "./scramble.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function glyphFrame(value, step) {
  return Array.from(value, (char, index) => {
    if (!/[0-9]/.test(char)) return char;
    return SCRAMBLE_RAMP[(index + step) % SCRAMBLE_RAMP.length] || char;
  }).join("");
}

function runCount(element) {
  const finalValue = element.dataset.countUp || element.textContent || "";

  if (reducedMotion.matches || element.dataset.counted === "true") {
    element.textContent = finalValue;
    element.dataset.counted = "true";
    return;
  }

  element.dataset.counted = "true";
  const duration = 720;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    if (progress < 1) {
      element.textContent = glyphFrame(finalValue, Math.floor(progress * 18));
      requestAnimationFrame(tick);
      return;
    }

    element.textContent = finalValue;
  };

  requestAnimationFrame(tick);
}

export function initCountUp() {
  const targets = document.querySelectorAll("[data-count-up]");

  if (reducedMotion.matches) {
    targets.forEach(runCount);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.2 }
  );

  targets.forEach((target) => observer.observe(target));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCountUp, { once: true });
} else {
  initCountUp();
}
