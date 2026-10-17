// Edge marker (picks, footer hybrid "cell grids but lighter"): a column of 7 px cells on an 8 px
// pitch, 4 px wide, on the row's left edge. On pointer hover it arrives top to bottom through
// levels 3 → 8 in two steps of 30 ms, the start of each cell spread on an ease-out over 60 ms
// (about 120 ms in all), and the label steps 8 px aside in one step. Keyboard focus lands it at 8
// at once. It leaves at once. The motion control is never a host: its contract forbids extra
// visible children and transforms.
// Tool panels (picks batch 3, hybrid A look + B interactions) use the same column on their 36 px
// buttons: 4 cells of 7 px. Tool scripts rewrite some button words with textContent ("Copied",
// "Play motion"), so the host repairs its column, fill layer and label after such a rewrite.
import { createCells, curves, runField, setLevel } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const TOOL_PANELS = ":is(.playground-controls, .pave-turntable-controls, .ascii-banner-studio__controls)";
const HOSTS = [
  ".site-footer .footer-links a",
  ".site-footer .site-footer__setting",
  `${TOOL_PANELS} button:not([data-ascii-action]):not([role="tab"]):not([role="option"]):not(.ascii-banner-studio__quality-trigger)`,
  `${TOOL_PANELS} .playground-studio-cta`
].join(", ");
const PITCH = 8;

function enhance(host) {
  if (!(host instanceof HTMLElement) || host.dataset.edgeMarker === "ready" || host.matches("[data-motion-toggle]")) return;
  host.dataset.edgeMarker = "ready";
  host.classList.add("has-edge-marker");

  // A press fill (press.js toggle) may already have wrapped the words; share its label.
  let label = host.querySelector(":scope > .fill-label");
  if (!label) {
    label = document.createElement("span");
    while (host.firstChild) label.append(host.firstChild);
    host.append(label);
  }
  label.classList.add("edge-marker__label");

  const column = document.createElement("span");
  column.className = "edge-marker";
  column.setAttribute("aria-hidden", "true");
  host.prepend(column);

  // Repair after an owner rewrites the words with textContent: stray nodes go back into the label,
  // and the column and fill layer return in front of it.
  new MutationObserver(() => {
    const layer = host._fillLayer;
    const stray = [...host.childNodes].filter((node) => node !== column && node !== label && node !== layer);
    if (!stray.length && label.parentNode === host && column.parentNode === host) return;
    if (stray.length) label.replaceChildren(...stray);
    host.append(label);
    if (layer) host.prepend(layer);
    host.prepend(column);
  }).observe(host, { childList: true });

  let cells = [];
  let stop = () => {};
  let on = false;

  const build = () => {
    const count = Math.max(1, Math.floor((host.clientHeight + 1) / PITCH));
    if (cells.length === count) return;
    column.textContent = "";
    cells = createCells(column, count, { clear: true });
  };

  const set = (want, instant) => {
    if (want === on && !instant) return;
    on = want;
    stop();
    host.classList.toggle("is-hot", want);
    if (!want) {
      cells.forEach((cell) => setLevel(cell, 0));
      return;
    }
    build();
    if (instant || !isMotionActive()) {
      cells.forEach((cell) => setLevel(cell, 8));
      return;
    }
    const path = [3, 8];
    stop = runField({
      values: cells.map((_, index) => index / Math.max(1, cells.length - 1)),
      total: 60,
      curve: curves.out,
      steps: path.length,
      stepMs: 30,
      render: (stepAt) => cells.forEach((cell, index) => {
        const at = stepAt(index);
        if (at >= 0) setLevel(cell, path[Math.min(at, path.length - 1)]);
      })
    });
  };

  host.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    set(true, false);
  });
  host.addEventListener("pointerleave", () => {
    if (!host.matches(":focus-visible")) set(false);
  });
  host.addEventListener("focus", () => {
    if (host.matches(":focus-visible")) set(true, true);
  });
  host.addEventListener("blur", () => {
    if (!host.matches(":hover")) set(false);
  });
}

export function initEdgeMarkers(root = document) {
  root.querySelectorAll(HOSTS).forEach(enhance);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initEdgeMarkers(), { once: true });
else initEdgeMarkers();
