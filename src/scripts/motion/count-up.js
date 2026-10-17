import { curves, runField } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Round 3: real numbers count through integers on a curve; anything that is not a number simply appears.
function parseCount(value) {
  const match = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return { prefix, suffix, target: Number(digits.replace(/,/g, "")), decimals, grouped: digits.includes(",") };
}

function formatCount({ prefix, suffix, decimals, grouped }, value) {
  const fixed = value.toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const wholeText = grouped ? Number(whole).toLocaleString("en-US") : whole;
  return `${prefix}${wholeText}${fraction ? `.${fraction}` : ""}${suffix}`;
}

function runCount(element) {
  const finalValue = element.dataset.countUp || element.textContent || "";
  const parsed = parseCount(finalValue);

  if (!parsed || !isMotionActive() || element.dataset.counted === "true") {
    element.textContent = finalValue;
    element.dataset.counted = "true";
    return;
  }

  element.dataset.counted = "true";
  const steps = 18;
  runField({
    values: [0],
    total: 0,
    steps,
    stepMs: 50,
    render: (stepAt) => {
      const progress = curves.out(Math.max(0, stepAt(0)) / steps);
      element.textContent = formatCount(parsed, parsed.target * progress);
    },
    done: () => {
      element.textContent = finalValue;
    }
  });
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
