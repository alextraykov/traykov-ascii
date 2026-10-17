// Sliders (picks, B): a track of 24 cells of 7 px on an 8 px pitch that fills to its value, with
// the leading cell part-way through the dither. The real input stays on top, invisible, for
// keyboard, pointer and assistive tech. Hover raises the leading cell one level. An arrow key moves
// one cell (1/24 of the range), snapped to the input's own step so owners get values they expect;
// it repaints on the next frame. Drags are 1:1. Disabled shows level-1 cells in a dotted frame.
// Programmatic changes (presets, resets, imported settings) repaint through a per-instance value
// setter, so owners need no changes.
import { createCells, setLevel } from "./cells.js";

const SCOPES = [
  ".playground-controls",
  ".pave-turntable-controls",
  ".ascii-banner-studio__controls",
  ".breathing-grid__inspector"
];
const SELECTOR = SCOPES.map((scope) => `${scope} input[type="range"]`).join(", ");
const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

function enhance(input) {
  if (!(input instanceof HTMLInputElement) || input.dataset.cellRange === "true") return;
  input.dataset.cellRange = "true";

  const track = document.createElement("span");
  track.className = "cell-range";
  const cells = createCells(track, 24);
  input.replaceWith(track);
  track.append(input);

  let hot = 0;
  const paint = () => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const disabled = input.disabled || input.getAttribute("aria-disabled") === "true";
    const x = ((Number(valueDescriptor.get.call(input)) - min) / Math.max(1e-9, max - min)) * cells.length;
    const whole = Math.floor(x + 1e-9);
    cells.forEach((cell, index) => {
      if (disabled) {
        setLevel(cell, 1);
        return;
      }
      const fill = x - index;
      const level = fill >= 1 ? 8 : fill <= 0 ? 0 : Math.ceil(fill * 8);
      setLevel(cell, index === Math.min(whole, cells.length - 1) && level < 8 ? Math.min(8, level + hot) : level);
    });
    track.classList.toggle("is-disabled", disabled);
    track.classList.toggle("is-dotted", disabled);
  };

  track.addEventListener("pointerenter", () => { hot = 1; paint(); });
  track.addEventListener("pointerleave", () => { hot = 0; paint(); });

  // One cell per arrow press, snapped to the input's step (or 1/24 of the range when it has none).
  input.addEventListener("keydown", (event) => {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (input.disabled || input.getAttribute("aria-disabled") === "true") return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const span = max - min;
    if (!(span > 0)) return;
    event.preventDefault();
    const cell = span / cells.length;
    const current = Number(valueDescriptor.get.call(input));
    const index = Math.round((current - min) / cell);
    let next = Math.max(min, Math.min(max, min + (index + direction) * cell));
    const step = Number(input.step);
    if (input.step && input.step !== "any" && step > 0) {
      next = min + Math.round((next - min) / step) * step;
      if (next === current) next = current + direction * step;
      const decimals = (input.step.split(".")[1] || "").length;
      next = Number(Math.max(min, Math.min(max, next)).toFixed(decimals));
    }
    if (next === current) return;
    valueDescriptor.set.call(input, String(next));
    requestAnimationFrame(paint);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  Object.defineProperty(input, "value", {
    configurable: true,
    get() {
      return valueDescriptor.get.call(this);
    },
    set(next) {
      valueDescriptor.set.call(this, next);
      paint();
    }
  });
  input.addEventListener("input", paint);
  input.addEventListener("change", paint);
  input.form?.addEventListener("reset", () => requestAnimationFrame(paint));
  new MutationObserver(paint).observe(input, { attributes: true, attributeFilter: ["disabled", "aria-disabled", "min", "max", "value"] });
  paint();
}

const start = () => document.querySelectorAll(SELECTOR).forEach(enhance);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
