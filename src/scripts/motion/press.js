// The press (picks, A): primary and secondary actions fill in reading order through levels
// 2 → 4 → 6 → 8 (20 ms a step, 80 ms spread), hold a beat, then step out 6 → 4 → 2 → 0 (40 ms a
// step). The label inverts once the mean level reaches 6 (.is-inverted). Timings come from the
// --press-a-* tokens. With motion off the click does its job and nothing is drawn.
import { createIcon, fillLayer } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";
import { loader as cellLoader } from "./loader.js";

const SELECTOR = '[data-ascii-action="primary"], [data-ascii-action="secondary"]';
const DONE_HOLD_MS = 1500;
const fills = new Set();

function readMs(token, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return fallback;
  return value.endsWith("ms") ? number : value.endsWith("s") ? number * 1000 : number;
}

const pressIn = () => ({
  order: "reading",
  levels: [2, 4, 6, 8],
  stepMs: 20,
  total: Math.max(0, readMs("--press-a-in", 160) - 80),
  invertAt: 6
});
const pressOut = () => ({ order: "reading", levels: [6, 4, 2, 0], stepMs: readMs("--press-a-out", 160) / 4, total: 0 });

function enhance(element) {
  if (element.dataset.pressReady === "true") return;
  element.dataset.pressReady = "true";
  element.classList.add("has-fill");

  const label = document.createElement("span");
  label.className = "fill-label";
  while (element.firstChild) label.append(element.firstChild);
  element.append(label);

  const fill = fillLayer(element, { size: 12, invertAt: 6 });
  fills.add(fill);
  workingAndDone(element, fill);
  let timer = 0;

  element.addEventListener("click", () => {
    if (element.matches(':disabled, [aria-disabled="true"]') || !isMotionActive()) return;
    if (element.dataset.pressState) return;
    window.clearTimeout(timer);
    fill.to(8, {
      ...pressIn(),
      done: () => {
        timer = window.setTimeout(() => {
          if (!element.dataset.pressState) fill.to(0, pressOut());
        }, readMs("--press-a-hold", 200));
      }
    });
  });
}

// Working and done (state ladder): while the button's form is busy, a quarter-turn loader sits in
// the button beside the owner's word ("Sending…"). When the form reports success, a green cell
// check shows for a moment, then the button returns to rest.
function workingAndDone(button, fill) {
  const form = button.closest("form");
  if (!(form instanceof HTMLFormElement) || button.type !== "submit") return;
  const status = form.querySelector('[role="status"]');
  const loader = document.createElement("span");
  loader.className = "press-loader cells";
  loader.setAttribute("aria-hidden", "true");
  loader.hidden = true;
  // The A quarter turn (loader.js): 2 × 2 at 5 px cells, the head moves every 3 ticks with a
  // level-3 tail; with motion off it rests on head + tail.
  const check = document.createElement("span");
  check.className = "press-check cell-icon--ok";
  check.setAttribute("aria-hidden", "true");
  check.hidden = true;
  createIcon(check, "check");
  const label = button.querySelector(":scope > .fill-label");
  (label || button).prepend(loader, check);

  let stopTick = () => {};
  let doneTimer = 0;
  new MutationObserver(() => {
    const busy = form.getAttribute("aria-busy") === "true";
    if (busy) {
      window.clearTimeout(doneTimer);
      button.dataset.pressState = "working";
      check.hidden = true;
      loader.hidden = false;
      fill.to(8, { levels: [8], stepMs: 1, total: 0 });
      stopTick();
      stopTick = cellLoader(loader, "quarter", { cell: 5, every: 3 });
      return;
    }
    if (button.dataset.pressState !== "working") return;
    stopTick();
    loader.hidden = true;
    fill.to(0, isMotionActive() ? pressOut() : { levels: [0], stepMs: 1, total: 0 });
    if (status?.getAttribute("data-state") === "success") {
      // Done: the marker is held (CSS on [data-press-state="done"]) beside the check and the owner's word.
      button.dataset.pressState = "done";
      check.hidden = false;
      doneTimer = window.setTimeout(() => {
        check.hidden = true;
        delete button.dataset.pressState;
      }, DONE_HOLD_MS);
    } else {
      delete button.dataset.pressState;
    }
  }).observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
}

// Toggle press (tool panels, B interaction on the A look): a tool button with aria-pressed fills
// diagonally to solid when it is pressed on and stays solid; it empties in one step when it is
// pressed off. Keyboard presses, owner changes and motion off land at once. Without JS the old
// solid [aria-pressed="true"] rule still shows the state.
const TOGGLE =
  ':is(.playground-controls, .pave-turntable-controls, .ascii-banner-studio__controls) button[aria-pressed]:not([data-ascii-action]):not([role="tab"]):not([role="option"])';

function enhanceToggle(button) {
  if (!(button instanceof HTMLButtonElement) || button.dataset.pressReady === "true") return;
  button.dataset.pressReady = "true";
  button.dataset.asciiPress = "toggle";
  button.classList.add("has-fill");

  let label = button.querySelector(":scope > .edge-marker__label");
  if (!label) {
    label = document.createElement("span");
    while (button.firstChild) label.append(button.firstChild);
    button.append(label);
  }
  label.classList.add("fill-label");
  const fill = fillLayer(button, { size: 8, invertAt: 6 });
  button._fillLayer = button.querySelector(":scope > .fill-layer");

  let pointer = false;
  button.addEventListener("pointerdown", () => (pointer = true));
  button.addEventListener("keydown", () => (pointer = false));
  const instant = (level) => fill.to(level, { levels: [level], stepMs: 1, total: 0 });
  let pressed = button.getAttribute("aria-pressed") === "true";
  if (pressed) requestAnimationFrame(() => instant(8));

  new MutationObserver(() => {
    const next = button.getAttribute("aria-pressed") === "true";
    if (next === pressed) return;
    pressed = next;
    const animate = pointer && isMotionActive();
    pointer = false;
    if (!next) instant(0);
    else if (!animate) instant(8);
    else fill.to(8, { order: "diagonal", levels: [2, 4, 6, 8], stepMs: 30, total: 90, invertAt: 6 });
  }).observe(button, { attributes: true, attributeFilter: ["aria-pressed"] });
}

export function initPress(root = document) {
  root.querySelectorAll(SELECTOR).forEach(enhance);
  root.querySelectorAll(TOGGLE).forEach(enhanceToggle);
}

// A page restored from the back/forward cache must not come back mid-fill.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  fills.forEach((fill) => fill.to(0, { levels: [0], stepMs: 1, total: 0 }));
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initPress(), { once: true });
} else {
  initPress();
}
