import { createCells, runField, setLevel } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Real numbers count up; anything that is not a number simply appears.
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

// Stat meter (picks, B): only where the figure is a percentage. 16 cells of 7 px under the numeral,
// lit to the share (42 % → 7 cells), filling with the count. The case-evidence CSS styles it.
const METER_CELLS = 16;

function meterFor(element, parsed) {
  if (!parsed || !parsed.suffix.trim().startsWith("%")) return null;
  const existing = element.nextElementSibling;
  if (existing instanceof HTMLElement && existing.classList.contains("case-stat__meter")) return [...existing.children];
  const meter = document.createElement("span");
  meter.className = "case-stat__meter cells";
  meter.setAttribute("aria-hidden", "true");
  meter.style.setProperty("--cells", String(METER_CELLS));
  meter.style.setProperty("--cell-size", "7px");
  meter.style.setProperty("--cell-gap", "1px");
  element.after(meter);
  return createCells(meter, METER_CELLS);
}

function paintMeter(cells, parsed, value) {
  if (!cells) return;
  const lit = Math.round((Math.min(100, Math.max(0, value)) / 100) * METER_CELLS);
  cells.forEach((cell, index) => setLevel(cell, index < lit ? 8 : 0));
}

// Picks (B): one integer per tick (40 ms) from 0 to the value, capped at 24 ticks, linear, no glyph
// noise; decimals keep their precision; the final figure is in the DOM at rest.
function runCount(element) {
  const finalValue = element.dataset.countUp || element.textContent || "";
  const parsed = parseCount(finalValue);
  const meter = meterFor(element, parsed);

  if (!parsed || !isMotionActive() || element.dataset.counted === "true") {
    element.textContent = finalValue;
    element.dataset.counted = "true";
    if (parsed) paintMeter(meter, parsed, parsed.target);
    return;
  }

  element.dataset.counted = "true";
  const steps = Math.min(24, Math.ceil(parsed.target));
  if (steps <= 0) {
    element.textContent = finalValue;
    paintMeter(meter, parsed, parsed.target);
    return;
  }
  runField({
    values: [0],
    total: 0,
    steps,
    stepMs: 40,
    render: (stepAt) => {
      const value = parsed.target * (Math.max(0, stepAt(0)) / steps);
      element.textContent = formatCount(parsed, parsed.decimals ? value : Math.round(value));
      paintMeter(meter, parsed, value);
    },
    done: () => {
      element.textContent = finalValue;
      paintMeter(meter, parsed, parsed.target);
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
