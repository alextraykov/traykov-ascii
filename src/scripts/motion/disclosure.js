// Disclosure (picks, A): the summary is a quiet action with a 5 × 3 cell chevron after the word.
// A pointer toggle morphs the chevron to its other direction in three steps over 120 ms and opens
// the panel with the A switch (clipped from the summary edge, four steps, 200 ms). Keyboard toggles
// swap the chevron at once and open at once. Closing is always instant (native details).
import { createIcon, morphIcon } from "./cells.js";
import { isMotionActive } from "./lifecycle.js";

const SELECTOR = ".notes-search, .pc-shell details.pc-disclosure";

function enhance(details) {
  if (!(details instanceof HTMLDetailsElement) || details.dataset.disclosureReady === "true") return;
  const summary = details.querySelector(":scope > summary");
  if (!summary) return;
  details.dataset.disclosureReady = "true";
  details.classList.add("pick-disclosure");

  const chevron = document.createElement("span");
  chevron.className = "pick-disclosure__chevron";
  summary.append(chevron);
  createIcon(chevron, details.open ? "chevronUp" : "chevron", { cell: 3 });

  let pointer = false;
  summary.addEventListener("click", (event) => {
    pointer = event.detail > 0;
  });

  details.addEventListener("toggle", () => {
    const name = details.open ? "chevronUp" : "chevron";
    const animate = pointer && isMotionActive();
    pointer = false;
    if (animate) morphIcon(chevron, name);
    else createIcon(chevron, name, { cell: 3 });
    if (!details.open || !animate) return;
    [...details.children].forEach((panel) => {
      if (panel === summary || !(panel instanceof HTMLElement)) return;
      panel.classList.remove("is-switching-a");
      void panel.offsetWidth;
      panel.classList.add("is-switching-a");
      panel.addEventListener("animationend", () => panel.classList.remove("is-switching-a"), { once: true });
    });
  });
}

export function initDisclosures(root = document) {
  root.querySelectorAll(SELECTOR).forEach(enhance);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initDisclosures(), { once: true });
else initDisclosures();
