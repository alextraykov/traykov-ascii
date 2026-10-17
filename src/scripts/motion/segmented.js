// Tabs and segmented controls (picks, A). The selected option is solid. A pointer click fills the
// new option in reading order through levels 2 → 4 → 6 → 8 (20 ms a step, 80 ms spread) while the
// old one empties in one step, and the panel the group controls snaps in (one step after 120 ms).
// Keyboard changes (arrows, Home, End, Enter, Space) land on the next frame with no fill animation.
// The owning scripts keep aria-pressed / aria-selected; this only draws.
import { fillLayer } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const GROUPS = [
  ".case-switch",
  ".breathing-grid__variants",
  ".breathing-grid__inspector > [role='group']",
  ".playground-flip-tabs",
  ".pave-turntable-tabs",
  ".pc-controls"
].join(", ");

// The panel each group controls and how it arrives when the selection changes: the A snap, except
// case evidence stages, which keep their B band sweep (owned by the case-evidence components).
const PANELS = [
  [".breathing-grid__variants, .breathing-grid__inspector > [role='group']", (group) => group.closest(".breathing-grid")?.querySelector(".breathing-grid__stage"), "is-snapping"],
  [".case-switch", (group) => group.closest("figure")?.querySelector(".case-compare__stage, .case-compare__media, .case-live__frame") || group.nextElementSibling, "is-sweeping"]
];

const isSelected = (button) =>
  button.getAttribute("aria-pressed") === "true" || button.getAttribute("aria-selected") === "true" || button.classList.contains("is-active");

function enhance(group) {
  if (!(group instanceof HTMLElement) || group.dataset.segmentedReady === "true") return;
  const buttons = [...group.children].filter((child) => child instanceof HTMLButtonElement);
  if (buttons.length < 2) return;
  group.dataset.segmentedReady = "true";

  const fills = new Map();
  buttons.forEach((button) => {
    button.classList.add("has-fill");
    const label = document.createElement("span");
    label.className = "fill-label";
    while (button.firstChild) label.append(button.firstChild);
    button.append(label);
    const fill = fillLayer(button, { size: 8 });
    fills.set(button, fill);
    if (isSelected(button)) fill.to(8, { levels: [8], stepMs: 1, total: 0 });
  });

  // The input kind of the next change: a keydown (within 120 ms) or a click without a pointer
  // (event.detail === 0) makes it instant.
  let keyedAt = -Infinity;
  group.addEventListener("keydown", () => { keyedAt = performance.now(); }, true);
  group.addEventListener("click", (event) => { if (event.detail === 0) keyedAt = performance.now(); }, true);

  const panelEntry = PANELS.find(([selector]) => group.matches(selector));
  const panelFor = panelEntry?.[1];
  const panelClass = panelEntry?.[2] || "is-snapping";
  let selected = buttons.find(isSelected) || null;

  const sync = () => {
    const next = buttons.find(isSelected) || null;
    if (next === selected) return;
    const animate = isMotionActive() && performance.now() - keyedAt > 120;
    if (selected) fills.get(selected)?.to(0, { levels: [0], stepMs: 1, total: 0 });
    if (next) {
      fills.get(next)?.to(8, animate
        ? { order: "reading", levels: [2, 4, 6, 8], stepMs: 20, total: 80 }
        : { levels: [8], stepMs: 1, total: 0 });
    }
    selected = next;
    const panel = panelFor?.(group);
    if (animate && panel instanceof HTMLElement) {
      panel.classList.remove("is-snapping", "is-sweeping");
      void panel.offsetWidth;
      panel.classList.add(panelClass);
      panel.addEventListener("animationend", () => panel.classList.remove(panelClass), { once: true });
    }
  };

  new MutationObserver(sync).observe(group, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-pressed", "aria-selected", "class"]
  });

  group.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    if (buttons.some((button) => button.hasAttribute("tabindex"))) return; // the owner runs a roving tabindex
    const enabled = buttons.filter((button) => !button.disabled && button.offsetParent !== null);
    const index = enabled.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const target =
      event.key === "Home" ? enabled[0]
        : event.key === "End" ? enabled[enabled.length - 1]
          : enabled[(index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
    target?.focus();
  });
}

export function initSegmented(root = document) {
  root.querySelectorAll(GROUPS).forEach(enhance);
}

const start = () => {
  initSegmented();
  // Some groups (the case switch) are revealed or built after load.
  new MutationObserver(() => initSegmented()).observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
