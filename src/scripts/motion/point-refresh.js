// Raster R5, point refresh (motion plan §4): hovering a work entry's media or a Labs screen sends a
// refresh outward from the pointer. Each cell briefly covers the image in paper through three
// dither levels (5 → 3 → 1) and clears, with delays on an ease-out curve of distance. Drawn on a
// short-lived canvas (too many cells for DOM), only on hover-capable devices with motion active.
import { curves } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const TARGETS = ".overview-video__frame, .labs-item__screen";
const CELL = 12;
const TOTAL = 360;
const STEP = 40;
const LEVELS = [5, 3, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const busy = new WeakSet();

function patterns(context, color) {
  const out = {};
  for (let level = 1; level <= 7; level += 1) {
    const tile = document.createElement("canvas");
    tile.width = 4;
    tile.height = 4;
    const tileContext = tile.getContext("2d");
    tileContext.fillStyle = color;
    BAYER.forEach((threshold, index) => {
      if (threshold < level * 2) tileContext.fillRect(index % 4, Math.floor(index / 4), 1, 1);
    });
    out[level] = context.createPattern(tile, "repeat");
  }
  return out;
}

function refresh(target, event) {
  if (busy.has(target) || !finePointer.matches || !isMotionActive()) return;
  const rect = target.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return;
  busy.add(target);

  const canvas = document.createElement("canvas");
  canvas.className = "point-refresh";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  target.append(canvas);
  const context = canvas.getContext("2d");
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbfbf8";
  const fills = patterns(context, paper);

  const cols = Math.ceil(rect.width / CELL);
  const rows = Math.ceil(rect.height / CELL);
  const px = (event.clientX - rect.left) / CELL;
  const py = (event.clientY - rect.top) / CELL;
  const far = Math.hypot(Math.max(px, cols - px), Math.max(py, rows - py)) || 1;
  const delays = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) delays.push(TOTAL * curves.out(Math.hypot(x + 0.5 - px, y + 0.5 - py) / far));
  }

  const start = performance.now();
  const end = TOTAL + LEVELS.length * STEP;
  const frame = (now) => {
    const elapsed = now - start;
    // Pausing motion ends the effect at once: no frames are scheduled while motion is off.
    if (!isMotionActive()) {
      canvas.remove();
      busy.delete(target);
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    delays.forEach((delay, index) => {
      const step = Math.floor((elapsed - delay) / STEP);
      if (step < 0 || step >= LEVELS.length) return;
      context.fillStyle = fills[LEVELS[step]];
      context.fillRect((index % cols) * CELL, Math.floor(index / cols) * CELL, CELL, CELL);
    });
    if (elapsed < end) {
      requestAnimationFrame(frame);
      return;
    }
    canvas.remove();
    window.setTimeout(() => busy.delete(target), 400);
  };
  requestAnimationFrame(frame);
}

document.addEventListener(
  "pointerover",
  (event) => {
    const target = event.target instanceof Element ? event.target.closest(TARGETS) : null;
    if (!(target instanceof HTMLElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    refresh(target, event);
  },
  { passive: true }
);

// Raster R4, dither dissolve: a featured case image arrives through the dither. A paper cover
// steps down 7 → 1 cell by cell in ordered-dither order (diagonal across the image), once per
// visit, when it first enters the view. Reduced motion and no-JS show the finished image.
const FEATURED = ".case-cover img, .case-hero-media img";

function dissolve(image) {
  const host = image.parentElement;
  if (!(host instanceof HTMLElement) || !isMotionActive()) return;
  const rect = image.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return;
  const canvas = document.createElement("canvas");
  canvas.className = "point-refresh";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const hostRect = host.getBoundingClientRect();
  canvas.style.inset = "auto";
  canvas.style.top = `${rect.top - hostRect.top}px`;
  canvas.style.left = `${rect.left - hostRect.left}px`;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  host.append(canvas);
  const context = canvas.getContext("2d");
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbfbf8";
  const fills = patterns(context, paper);
  const cell = 16;
  const cols = Math.ceil(rect.width / cell);
  const rows = Math.ceil(rect.height / cell);
  const delays = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const order = (x + y) / Math.max(1, cols + rows - 2);
      delays.push(480 * curves.out(order) + (BAYER[(y % 4) * 4 + (x % 4)] / 16) * 60);
    }
  }
  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    if (!isMotionActive()) {
      canvas.remove();
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    delays.forEach((delay, index) => {
      const step = Math.floor((elapsed - delay) / 30);
      const level = step < 0 ? 8 : 7 - step;
      if (level <= 0) return;
      alive = true;
      context.fillStyle = level >= 8 ? paper : fills[level];
      context.fillRect((index % cols) * cell, Math.floor(index / cols) * cell, cell, cell);
    });
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

const featuredObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      featuredObserver.unobserve(entry.target);
      const image = entry.target;
      if (image.complete) dissolve(image);
      else image.addEventListener("load", () => dissolve(image), { once: true });
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll(FEATURED).forEach((image) => featuredObserver.observe(image));
