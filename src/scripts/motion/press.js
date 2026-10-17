// Round 3: the press. Primary and secondary actions fill with a diagonal dither on click, hold for
// a beat, then dissolve. The label inverts only while ink is behind it (.fill-label, difference).
// With motion off the click does its job and nothing is drawn.
import { createCells, createIcon, fillLayer, setLevel } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";
import { onTick } from "./tick.js";

const SELECTOR = '[data-ascii-action="primary"], [data-ascii-action="secondary"]';
const HOLD_MS = 260;
const fills = new Set();

function enhance(element) {
  if (element.dataset.pressReady === "true") return;
  element.dataset.pressReady = "true";
  element.classList.add("has-fill");

  const label = document.createElement("span");
  label.className = "fill-label";
  while (element.firstChild) label.append(element.firstChild);
  element.append(label);

  const fill = fillLayer(element, { size: 12 });
  fills.add(fill);
  workingAndDone(element, fill);
  let timer = 0;

  element.addEventListener("click", () => {
    if (element.matches(':disabled, [aria-disabled="true"]') || !isMotionActive()) return;
    window.clearTimeout(timer);
    fill.to(8, {
      total: 180,
      done: () => {
        timer = window.setTimeout(() => fill.to(0, { total: 220 }), HOLD_MS);
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
  const quad = createCells(loader, 4);
  const check = document.createElement("span");
  check.className = "press-check cell-icon--ok";
  check.setAttribute("aria-hidden", "true");
  check.hidden = true;
  createIcon(check, "check");
  const label = button.querySelector(":scope > .fill-label");
  (label || button).prepend(loader, check);

  let stopTick = () => {};
  let doneTimer = 0;
  const order = [0, 1, 3, 2];
  new MutationObserver(() => {
    const busy = form.getAttribute("aria-busy") === "true";
    if (busy) {
      window.clearTimeout(doneTimer);
      button.dataset.pressState = "working";
      check.hidden = true;
      loader.hidden = false;
      fill.to(8, { total: 0 });
      stopTick();
      stopTick = onTick(loader, (count) => {
        const head = Math.floor(count / 3) % 4;
        order.forEach((cellIndex, step) => setLevel(quad[cellIndex], step === head ? 8 : step === (head + 3) % 4 ? 3 : 0));
      });
      order.forEach((cellIndex, step) => setLevel(quad[cellIndex], step === 0 ? 8 : 0));
      return;
    }
    if (button.dataset.pressState !== "working") return;
    stopTick();
    loader.hidden = true;
    fill.to(0, { total: isMotionActive() ? 220 : 0 });
    if (status?.getAttribute("data-state") === "success") {
      button.dataset.pressState = "done";
      check.hidden = false;
      doneTimer = window.setTimeout(() => {
        check.hidden = true;
        delete button.dataset.pressState;
      }, 1600);
    } else {
      delete button.dataset.pressState;
    }
  }).observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
}

export function initPress(root = document) {
  root.querySelectorAll(SELECTOR).forEach(enhance);
}

// A page restored from the back/forward cache must not come back mid-fill.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  fills.forEach((fill) => fill.to(0, { total: 0 }));
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initPress(), { once: true });
} else {
  initPress();
}
