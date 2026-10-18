// Case index (picks batch 3). The inline script in CaseStudyPage owns the semantics: which link is
// aria-current, the hash, the compact toggle. This module only draws on top of it.
// Desktop rail (hybrid A + C): "On this case" and "28% read" in Departure 11 over one 4 × 17 reading
// cell per section; at 901–1180 only the cells show and each title moves into the A tooltip.
// Phone strip and sheet (hybrid C + A): the section number, a title that resolves through the dither
// mask (2 → 4 → 6 → none, 50 ms a step), a Contents/Close word on an A soft rule, a 12-cell progress
// row, and a sheet that resolves from a line (240 ms) over a level-2 ink scrim and leaves with the
// afterglow (180 ms; instant from the keyboard). Link text is never changed, so the private template
// and no-JS stay identical.
import { createCells, setLevel } from "./motion/cells.js";
import { isMotionActive } from "./motion/lifecycle.js";
import { initTooltips } from "./motion/tooltip.js";

const pad2 = (value) => String(value).padStart(2, "0");

function readingOffset() {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;block-size:var(--case-reading-offset)";
  document.body.append(probe);
  const offset = Math.ceil(probe.getBoundingClientRect().height);
  probe.remove();
  return offset || 96;
}

function initCaseIndex(toc) {
  if (!(toc instanceof HTMLElement) || toc.dataset.caseIndex === "cells") return;
  const links = [...toc.querySelectorAll("[data-case-target]")].filter((link) => link instanceof HTMLAnchorElement);
  const sections = links.map((link) => document.getElementById(link.dataset.caseTarget || ""));
  if (!links.length || sections.some((section) => !(section instanceof HTMLElement))) return;

  const compact = window.matchMedia("(max-width: 900px)");
  const tools = document.querySelector("[data-case-reading-tools]");
  const body = document.querySelector(".case-study-body") || document.querySelector("main");
  const list = toc.querySelector("ol");
  const toggle = toc.querySelector("[data-case-toc-toggle]");
  const current = toc.querySelector("[data-case-toc-current]");
  toc.dataset.caseIndex = "cells";

  const make = (className) => {
    const element = document.createElement("span");
    element.className = className;
    element.setAttribute("aria-hidden", "true");
    return element;
  };

  const read = make("case-toc__read");
  toc.querySelector(":scope > p")?.append(read);

  const number = make("case-toc__num");
  const word = make("case-toc__word");
  word.textContent = "Contents";
  const progress = make("case-toc__progress");
  if (toggle instanceof HTMLElement) toggle.append(number, word, progress);
  const progressCells = createCells(progress, 12, { clear: true });

  // Phone strip title: when the inline script names a new section, it resolves through the dither
  // mask (data-level 2 → 4 → 6, then plain). The text itself is never rewritten here.
  let titleTimers = [];
  const resolveTitle = () => {
    titleTimers.forEach((timer) => window.clearTimeout(timer));
    titleTimers = [];
    if (!(current instanceof HTMLElement)) return;
    delete current.dataset.level;
    if (!compact.matches || !isMotionActive()) return;
    [2, 4, 6].forEach((level, step) => {
      titleTimers.push(window.setTimeout(() => (current.dataset.level = String(level)), step * 50));
    });
    titleTimers.push(window.setTimeout(() => delete current.dataset.level, 150));
  };
  if (current instanceof HTMLElement) {
    let lastTitle = current.textContent?.trim() || "";
    new MutationObserver(() => {
      const next = current.textContent?.trim() || "";
      if (!next || next === lastTitle) return;
      lastTitle = next;
      resolveTitle();
    }).observe(current, { childList: true, characterData: true, subtree: true });
  }

  // Section names stay visible at every desktop width (Alexander, 18 Oct 2026), so the tooltip
  // that used to carry them at 901–1180 never switches on; it stays emptied over a visible title.
  const narrow = { matches: false, addEventListener: () => {} };
  const syncTips = () => {
    links.forEach((link) => {
      const text = link.textContent?.trim() || "";
      // A name cut short by the narrow rail keeps its full text as the native title.
      link.setAttribute("title", link.scrollWidth > link.clientWidth ? text : "");
      if (narrow.matches) {
        link.dataset.tooltip = text;
        link.setAttribute("title", text);
      } else if (link.dataset.tooltipReady === "true") {
        delete link.dataset.tooltip;
        link.setAttribute("title", "");
      }
    });
    if (narrow.matches) initTooltips(toc);
  };
  syncTips();
  narrow.addEventListener?.("change", syncTips);
  window.addEventListener("resize", syncTips, { passive: true });

  // Contents / Close, and the sheet: it resolves from a 2 px line through the dither (240 ms) over a
  // scrim; a pointer close leaves with the afterglow (180 ms), Escape and keyboard close at once.
  if (toggle instanceof HTMLElement && list instanceof HTMLElement) {
    const scrim = document.createElement("span");
    scrim.className = "case-toc__scrim";
    scrim.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    document.body.append(scrim);

    let pointerClose = false;
    const notePointer = (event) => {
      pointerClose = event.type === "pointerdown" || (event.type === "click" && event.detail > 0);
    };
    document.addEventListener("pointerdown", notePointer, true);
    document.addEventListener("keydown", () => (pointerClose = false), true);

    let closeTimer = 0;
    const clearSheet = () => {
      window.clearTimeout(closeTimer);
      list.classList.remove("is-sheet-on", "is-sheet-off");
    };

    let wasOpen = false;
    new MutationObserver(() => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      word.textContent = open ? "Close" : "Contents";
      if (open === wasOpen) return;
      wasOpen = open;
      const animate = pointerClose && isMotionActive() && compact.matches;
      pointerClose = false;
      if (open) {
        clearSheet();
        const strip = tools instanceof HTMLElement ? tools.getBoundingClientRect().bottom : toggle.getBoundingClientRect().bottom;
        scrim.style.setProperty("--strip-bottom", `${Math.max(0, Math.round(strip))}px`);
        scrim.hidden = !compact.matches;
        const active = list.querySelector('[aria-current="location"]')?.closest("li");
        if (active instanceof HTMLElement) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 3);
        if (!animate) return;
        void list.offsetWidth;
        list.classList.add("is-sheet-on");
        return;
      }
      scrim.hidden = true;
      clearSheet();
      if (!animate) return;
      list.classList.add("is-sheet-off");
      closeTimer = window.setTimeout(() => list.classList.remove("is-sheet-off"), 180);
    }).observe(toggle, { attributes: true, attributeFilter: ["aria-expanded"] });
    list.addEventListener("animationend", (event) => {
      if (event.target === list) list.classList.remove("is-sheet-on");
    });
  }

  let lastActive = -2;
  const paint = () => {
    frame = 0;
    const line =
      (compact.matches && tools instanceof HTMLElement ? Math.ceil(tools.getBoundingClientRect().bottom) : readingOffset()) + 8;
    let active = -1;
    sections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= line + 1) active = index;
    });
    const bodyRect = body instanceof HTMLElement ? body.getBoundingClientRect() : null;
    const top = active >= 0 ? sections[active].getBoundingClientRect().top : 0;
    const end =
      active >= 0 && active < sections.length - 1
        ? sections[active + 1].getBoundingClientRect().top
        : bodyRect
          ? bodyRect.bottom
          : top + 1;
    const within = active >= 0 ? Math.max(0, Math.min(1, (line - top) / Math.max(1, end - top))) : 0;
    const overall = bodyRect ? Math.max(0, Math.min(1, (line - bodyRect.top) / Math.max(1, bodyRect.height))) : 0;

    links.forEach((link, index) => {
      const state = index < active ? "read" : index === active ? "current" : "unread";
      const level = state === "read" ? 3 : state === "current" ? Math.max(1, Math.round(1 + within * 7)) : 0;
      if (link.dataset.tocState !== state) link.dataset.tocState = state;
      if (link.dataset.tocLevel !== String(level)) link.dataset.tocLevel = String(level);
    });
    progressCells.forEach((cell, index) => {
      const x = overall * progressCells.length - index;
      setLevel(cell, x >= 1 ? 8 : x <= 0 ? 0 : Math.ceil(x * 8));
    });
    read.textContent = `${Math.round(overall * 100)}% read`;
    number.textContent = active >= 0 ? pad2(active + 1) : "··";

    // Keep the current row in view inside a scrolling rail without moving the page.
    if (active !== lastActive && active >= 0 && !compact.matches && list instanceof HTMLElement && list.scrollHeight > list.clientHeight) {
      const row = links[active].closest("li");
      if (row instanceof HTMLElement && (row.offsetTop < list.scrollTop + 24 || row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight - 24)) {
        list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 3);
      }
    }
    lastActive = active;
  };

  let frame = 0;
  const queue = () => {
    if (!frame) frame = window.requestAnimationFrame(paint);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  window.addEventListener("hashchange", queue);
  compact.addEventListener?.("change", queue);
  paint();
}

// Sibling nav (C): the marker leaves through 6 → 3 → 0 (80 ms) after a pointer leaves the half.
function initSiblingMarkers() {
  document.querySelectorAll(".case-sibling-nav a").forEach((link) => {
    if (!(link instanceof HTMLElement) || link.dataset.markerReady === "true") return;
    link.dataset.markerReady = "true";
    link.addEventListener("pointerenter", () => link.classList.remove("is-marker-out"));
    link.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch" || !isMotionActive()) return;
      link.classList.add("is-marker-out");
    });
    link.addEventListener("animationend", () => link.classList.remove("is-marker-out"));
  });
}

const start = () => {
  document.querySelectorAll(".case-toc").forEach(initCaseIndex);
  initSiblingMarkers();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
