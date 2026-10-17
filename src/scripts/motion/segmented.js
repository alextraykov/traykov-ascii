// Round 3 tabs and segmented controls (component specimen §3). The selected option is solid.
// Choosing another hands the fill across: the new option dithers in from the left while the old
// one dithers out, and the panel the group controls arrives with a band sweep. Arrow keys move
// between options. The owning scripts keep aria-pressed / aria-selected; this only draws.
import { fillLayer } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const GROUPS = [
  ".case-switch",
  ".breathing-grid__variants",
  ".breathing-grid__inspector > [role='group']",
  ".playground-flip-tabs",
  ".pave-turntable-tabs"
].join(", ");

// The panel each group controls: it gets the band sweep when the selection changes.
const PANELS = [
  [".breathing-grid__variants, .breathing-grid__inspector > [role='group']", (group) => group.closest(".breathing-grid")?.querySelector(".breathing-grid__stage")],
  [".case-switch", (group) => group.closest("figure")?.querySelector(".case-compare__stage, .case-compare__media, .case-live__frame") || group.nextElementSibling]
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
    const fill = fillLayer(button, { size: 6 });
    fills.set(button, fill);
    if (isSelected(button)) fill.to(8, { total: 0 });
  });

  const panelFor = PANELS.find(([selector]) => group.matches(selector))?.[1];
  let selected = buttons.find(isSelected) || null;

  const sync = () => {
    const next = buttons.find(isSelected) || null;
    if (next === selected) return;
    const animate = isMotionActive();
    if (selected) fills.get(selected)?.to(0, { order: "reading", total: animate ? 200 : 0 });
    if (next) fills.get(next)?.to(8, { order: "reading", total: animate ? 240 : 0 });
    selected = next;
    const panel = panelFor?.(group);
    if (animate && panel instanceof HTMLElement) {
      panel.classList.remove("is-sweeping");
      void panel.offsetWidth;
      panel.classList.add("is-sweeping");
      panel.addEventListener("animationend", () => panel.classList.remove("is-sweeping"), { once: true });
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
