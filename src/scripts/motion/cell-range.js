// Round 3 sliders (component specimen, Tools): a range is a track of 24 cells that fills to its
// value, with the leading cell part-way through the dither. The real input stays on top, invisible,
// for keyboard, pointer and assistive tech. Programmatic changes (presets, resets, imported
// settings) repaint through a per-instance value setter, so owners need no changes.
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

  const paint = () => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const x = ((Number(valueDescriptor.get.call(input)) - min) / Math.max(1e-9, max - min)) * cells.length;
    cells.forEach((cell, index) => {
      const fill = x - index;
      setLevel(cell, fill >= 1 ? 8 : fill <= 0 ? 0 : Math.ceil(fill * 8));
    });
    track.classList.toggle("is-disabled", input.disabled);
  };

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
  new MutationObserver(paint).observe(input, { attributes: true, attributeFilter: ["disabled", "min", "max", "value"] });
  paint();
}

const start = () => document.querySelectorAll(SELECTOR).forEach(enhance);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
