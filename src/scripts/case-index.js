// Round 3 case index (motion plan §8). The inline script in CaseStudyPage owns the semantics:
// which link is aria-current, the hash, the compact toggle. This module only draws on top of it:
// one dithered reading cell per section, "28% read", and on phones a strip with the section number,
// a title that resolves through ░ ▓, a Contents/Close word, 30 progress cells and a sheet that
// switches on. Link text is never changed, so the private template and no-JS stay identical.
import { createCells, curves, runField, setLevel } from "./motion/cells.js";
import { isMotionActive } from "./motion/lifecycle.js";

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
  const progressCells = createCells(progress, 30, { clear: true });

  // Phone strip title: when the inline script names a new section, it resolves through ░ ▓.
  let writing = false;
  let stopTitle = () => {};
  const resolveTitle = (text) => {
    stopTitle();
    if (!(current instanceof HTMLElement) || !compact.matches || !isMotionActive()) return;
    const chars = [...text];
    stopTitle = runField({
      values: chars.map((_, index) => index / Math.max(1, chars.length - 1)),
      total: 220,
      curve: curves.out,
      steps: 2,
      stepMs: 30,
      render: (stepAt) => {
        writing = true;
        current.textContent = chars
          .map((char, index) => (char === " " ? " " : stepAt(index) < 0 ? " " : stepAt(index) >= 2 ? char : stepAt(index) === 0 ? "░" : "▓"))
          .join("");
        writing = false;
      },
      done: () => {
        writing = true;
        current.textContent = text;
        writing = false;
      }
    });
  };
  if (current instanceof HTMLElement) {
    let lastTitle = current.textContent?.trim() || "";
    new MutationObserver(() => {
      // Observer callbacks run after the write, so frames of our own animation are recognised by
      // their shade characters rather than by a flag.
      const next = current.textContent?.trim() || "";
      if (writing || /[░▓]/.test(next) || !next.replace(/\s/g, "")) return;
      if (next !== lastTitle) {
        lastTitle = next;
        resolveTitle(next);
      }
    }).observe(current, { childList: true, characterData: true, subtree: true });
  }

  // Contents / Close, and the sheet switching on from the strip.
  if (toggle instanceof HTMLElement && list instanceof HTMLElement) {
    new MutationObserver(() => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      word.textContent = open ? "Close" : "Contents";
      if (!open) return;
      const active = list.querySelector('[aria-current="location"]')?.closest("li");
      if (active instanceof HTMLElement) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 3);
      if (!isMotionActive()) return;
      list.classList.remove("is-sheet-on");
      void list.offsetWidth;
      list.classList.add("is-sheet-on");
    }).observe(toggle, { attributes: true, attributeFilter: ["aria-expanded"] });
    list.addEventListener("animationend", () => list.classList.remove("is-sheet-on"));
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

const start = () => document.querySelectorAll(".case-toc").forEach(initCaseIndex);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
