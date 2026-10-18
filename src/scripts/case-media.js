// Case-study switches (before/after, live states, gallery themes) and lazy prototype iframes.
// Server markup is complete without JS: every panel is visible and switches stay hidden.

import { isMotionActive, onMotionChange } from "./motion/lifecycle.js";
import { curves, runField, setLevel } from "./motion/cells.js";
import { scrambleElement } from "./motion/scramble.js";
import { onTick } from "./motion/tick.js";

function pressOnly(group, active) {
  group.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button === active));
  });
}

function initCompare(figure) {
  const group = figure.querySelector("[data-case-compare-switch]");
  if (!group) return;
  const panels = [...figure.querySelectorAll("[data-case-compare-panel]")];

  const show = (index) => {
    panels.forEach((panel) => {
      const active = panel.dataset.caseComparePanel === index;
      panel.dataset.active = String(active);
      panel.toggleAttribute("inert", !active);
      const video = panel.querySelector("video");
      if (!video) return;
      if (!active) video.pause();
      else if (video.dataset.caseVideoVisible === "true" && isMotionActive()) video.play().catch(() => {});
    });
  };

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-compare-option]");
    if (!button) return;
    pressOnly(group, button);
    show(button.dataset.caseCompareOption);
  });

  group.hidden = false;
  figure.dataset.caseCompareReady = "true";
  show("0");
}

const liveFrames = new Set();
let liveObserver;

function loadFrame(frame, load) {
  const next = load ? frame.dataset.caseLiveSrc : "about:blank";
  if (frame.getAttribute("src") === next) return;
  if (!load && !frame.getAttribute("src")) return;
  frame.setAttribute("src", next);
  frame.closest(".case-live__frame")?.toggleAttribute("data-loaded", load);
}

function initLiveFrame(frame) {
  if (liveFrames.has(frame)) return;
  liveFrames.add(frame);
  frame.addEventListener("load", () => {
    if (frame.getAttribute("src") !== "about:blank") frame.removeAttribute("tabindex");
  });
  liveObserver =
    liveObserver ||
    new IntersectionObserver(
      (entries) => entries.forEach((entry) => loadFrame(entry.target, entry.isIntersecting)),
      { rootMargin: "600px 0px" }
    );
  liveObserver.observe(frame);
}

function initLiveSwitcher(figure) {
  const group = figure.querySelector("[data-case-live-switch]");
  const frame = figure.querySelector("iframe[data-case-live-src]");
  if (!group || !frame) return;
  const base = figure.dataset.caseLiveBase ?? "";
  const open = figure.querySelector("[data-case-live-open]");
  const current = figure.querySelector("[data-case-live-current]");

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-live-value]");
    if (!button) return;
    pressOnly(group, button);
    const src = base + button.dataset.caseLiveValue;
    frame.dataset.caseLiveSrc = src;
    if (frame.getAttribute("src") && frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", src);
    if (open) open.href = src;
    if (current) {
      const tag = button.dataset.caseLiveTag ?? "";
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      current.innerHTML = tag ? `<span class="case-tag case-tag--${slug}"></span>` : "";
      current.firstElementChild?.append(tag);
    }
  });

  group.hidden = false;
  figure.querySelector("[data-case-live-fallback-list]")?.setAttribute("hidden", "");
}

function initGallery(figure) {
  const group = figure.querySelector("[data-case-gallery-switch]");
  if (!group) return;

  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-gallery-theme]");
    if (!button) return;
    pressOnly(group, button);
    const theme = button.dataset.caseGalleryTheme;
    figure.dataset.caseGalleryActive = theme;
    figure.querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute(`data-case-gallery-${theme}`);
      if (src) image.src = src;
    });
  });

  group.hidden = false;
}

// Scaled demos render at a desktop viewport and shrink to the column, so nothing is cropped.
let scaleObserver;
function initScaledFrame(frame) {
  const width = Number.parseFloat(frame.style.getPropertyValue("--case-live-width"));
  if (!width) return;
  scaleObserver =
    scaleObserver ||
    new ResizeObserver((entries) =>
      entries.forEach((entry) => {
        const own = Number.parseFloat(entry.target.style.getPropertyValue("--case-live-width"));
        entry.target.style.setProperty("--case-live-scale", String(entry.contentRect.width / own));
      })
    );
  scaleObserver.observe(frame);
}

// Timeline (component specimen 36 · B): a reading line two thirds down the viewport. Each day
// cell it passes lights to level 3, one every 30 ms going forward; each event it reaches turns its
// mark solid and shows its entry. The latest reached mark blinks on the tick. Scrolling back
// returns cells and entries at once. Motion off or no JS: everything is at rest, complete.
function initTimeline(section) {
  const items = [...section.querySelectorAll("[data-case-timeline-item]")];
  if (!items.length) return;
  const rows = items.map((item) => ({
    item,
    mark: item.querySelector(".case-timeline__mark"),
    entry: item.querySelector(".case-timeline__entry"),
    time: item.querySelector("time"),
    days: [...item.querySelectorAll(".case-timeline__day")]
  }));
  const rest = () => {
    section.removeAttribute("data-case-timeline-ready");
    rows.forEach(({ item, mark, days }) => {
      item.dataset.reached = "true";
      item.removeAttribute("data-current");
      if (mark) setLevel(mark, 8);
      days.forEach((cell) => setLevel(cell, 3));
    });
  };
  if (!isMotionActive()) {
    rest();
    return;
  }
  section.dataset.caseTimelineReady = "true";
  rows.forEach(({ mark, days }) => {
    if (mark) setLevel(mark, 3);
    days.forEach((cell) => setLevel(cell, 0));
  });

  let timers = [];
  let frame = 0;
  // The reading line, in page coordinates. It sweeps down the timeline on its own once the
  // timeline is in view, so every event resolves without the reader having to scroll to it.
  let lineY = -Infinity;
  const update = () => {
    frame = 0;
    if (!isMotionActive()) {
      timers.forEach(clearTimeout);
      timers = [];
      rest();
      return;
    }
    section.dataset.caseTimelineReady = "true";
    const line = lineY - window.scrollY;
    let current = -1;
    let queue = 0;
    rows.forEach(({ item, mark, time, days }, index) => {
      const reached = item.getBoundingClientRect().top < line;
      if (reached) current = index;
      if (reached && item.dataset.reached !== "true") {
        item.dataset.reached = "true";
        if (mark) setLevel(mark, 8);
        if (time) scrambleElement(time, { duration: 240 });
      } else if (!reached && item.dataset.reached === "true") {
        delete item.dataset.reached;
        if (mark) setLevel(mark, 3);
      }
      days.forEach((cell) => {
        const passed = cell.getBoundingClientRect().top < line;
        const lit = cell.dataset.level !== "0";
        if (passed && !lit && cell.dataset.pending !== "true") {
          cell.dataset.pending = "true";
          queue += 1;
          timers.push(
            setTimeout(() => {
              delete cell.dataset.pending;
              if (cell.getBoundingClientRect().top < lineY - window.scrollY) setLevel(cell, 3);
            }, 30 * queue)
          );
        } else if (!passed && (lit || cell.dataset.pending === "true")) {
          delete cell.dataset.pending;
          setLevel(cell, 0);
        }
      });
    });
    rows.forEach(({ item, mark }, index) => {
      item.toggleAttribute("data-current", index === current);
      if (index !== current && item.dataset.reached === "true" && mark) setLevel(mark, 8);
    });
  };
  // The latest reached mark blinks 10 ticks solid, 10 ticks at level 3; it rests solid.
  onTick(section, (count) => {
    const row = rows.find(({ item }) => item.hasAttribute("data-current"));
    if (row?.mark) setLevel(row.mark, Math.floor(count / 10) % 2 ? 3 : 8);
  });
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const sweep = () => {
    const start = section.getBoundingClientRect().top + window.scrollY;
    const length = section.offsetHeight;
    const duration = Math.min(1800, 160 * rows.length);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      lineY = start + length * (1 - Math.pow(1 - p, 3)) + (p === 1 ? Infinity : 0);
      update();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      sweep();
    },
    { threshold: 0.15 }
  );
  io.observe(section);
  window.addEventListener("scroll", onScroll, { passive: true });
  onMotionChange(() => onScroll(), { immediate: false });
}

// Quote carousel: one quote at a time, each change a quick dither out and in. A meter per quote
// runs on CSS steps and advances the carousel when it fills. Pointer, focus or Pause hold it.
function initQuotes(section) {
  const slides = [...section.querySelectorAll("[data-case-quote-slide]")];
  const controls = section.querySelector("[data-case-quotes-controls]");
  const meters = [...section.querySelectorAll("[data-case-quote-go]")];
  const pause = section.querySelector("[data-case-quote-pause]");
  const stage = section.querySelector(".case-quotes__stage");
  if (slides.length < 2 || !controls || !pause || !stage) return;
  let index = 0;
  let userPaused = !isMotionActive();
  let held = false;
  let visible = false;
  let stop = () => {};

  const playing = () => !userPaused && !held && visible && isMotionActive();
  const sync = () => {
    section.toggleAttribute("data-playing", playing());
    pause.setAttribute("aria-pressed", String(userPaused));
    pause.textContent = userPaused ? "Play" : "Pause";
    stage.setAttribute("aria-live", playing() ? "off" : "polite");
  };

  const show = (next, { instant = false } = {}) => {
    const outgoing = slides[index];
    index = (next + slides.length) % slides.length;
    const incoming = slides[index];
    meters.forEach((meter, at) => {
      meter.toggleAttribute("data-current", at === index);
      meter.toggleAttribute("data-done", at < index);
      meter.setAttribute("aria-current", String(at === index));
    });
    // Restart the current meter's fill.
    const fill = meters[index].firstElementChild;
    fill.style.animation = "none";
    void fill.offsetWidth;
    fill.style.animation = "";
    stop();
    slides.forEach((slide) => {
      if (slide !== outgoing && slide !== incoming) {
        slide.dataset.state = "off";
        slide.removeAttribute("data-level");
      }
    });
    if (instant || !isMotionActive() || outgoing === incoming) {
      outgoing.dataset.state = "off";
      incoming.dataset.state = "on";
      incoming.removeAttribute("data-level");
      return;
    }
    incoming.dataset.state = "in";
    setLevel(incoming, 0);
    stop = runField({
      values: [0, 1],
      total: 90,
      curve: curves.out,
      steps: 7,
      stepMs: 26,
      render: (stepAt) => {
        const out = stepAt(0);
        const into = stepAt(1);
        setLevel(outgoing, 8 - Math.max(0, out + 1));
        setLevel(incoming, Math.max(0, into + 1));
      },
      done: () => {
        outgoing.dataset.state = "off";
        outgoing.removeAttribute("data-level");
        incoming.dataset.state = "on";
        incoming.removeAttribute("data-level");
      }
    });
    const by = incoming.querySelector(".case-quotes__by");
    if (by) scrambleElement(by, { duration: 300 });
  };

  meters.forEach((meter) => {
    meter.firstElementChild.addEventListener("animationend", () => {
      if (playing()) show(index + 1);
    });
    meter.addEventListener("click", () => show(Number(meter.dataset.caseQuoteGo)));
  });
  section.querySelectorAll("[data-case-quote-step]").forEach((button) =>
    button.addEventListener("click", () => show(index + Number(button.dataset.caseQuoteStep)))
  );
  pause.addEventListener("click", () => {
    userPaused = !userPaused;
    sync();
  });
  section.addEventListener("pointerenter", () => {
    held = true;
    sync();
  });
  section.addEventListener("pointerleave", () => {
    held = false;
    sync();
  });
  section.addEventListener("focusin", () => {
    held = true;
    sync();
  });
  section.addEventListener("focusout", (event) => {
    if (section.contains(event.relatedTarget)) return;
    held = false;
    sync();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: 0.4 }).observe(section);

  section.dataset.caseQuotesReady = "true";
  controls.hidden = false;
  show(0, { instant: true });
  sync();
}

// Drag-to-compare (component specimen 30 · B): the after image is clipped at the split; the range
// input under the pointer carries dragging and the keyboard (arrows, Home, End, Page keys). A corner
// label steps out of the way while the divider would cross it.
function initSlider(figure) {
  const stage = figure.querySelector(".case-slider__stage");
  const range = figure.querySelector("[data-case-slider-range]");
  if (!stage || !range) return;
  const corners = [...figure.querySelectorAll("[data-case-slider-corner]")];
  const clearCorners = (split) => {
    const width = stage.clientWidth;
    const x = (split / 100) * width;
    const room = 12;
    corners.forEach((corner) => {
      const left = corner.offsetLeft;
      const right = left + corner.offsetWidth;
      corner.toggleAttribute("data-covered", x > left - room && x < right + room);
    });
  };
  const [before, after] = corners.map((corner) => corner.textContent.trim());
  const set = (value) => {
    const clamped = Math.max(0, Math.min(100, value));
    const shown = Math.round(clamped);
    figure.style.setProperty("--split", `${clamped}%`);
    range.value = String(shown);
    range.setAttribute("aria-valuetext", before && after ? `${shown}% ${before}, ${100 - shown}% ${after}` : `${shown}%`);
    clearCorners(clamped);
  };
  range.addEventListener("input", () => set(Number(range.value)));
  // The pointer maps 1:1 to the divider (the native thumb would be off by half its width).
  const fromPointer = (event) => {
    const rect = stage.getBoundingClientRect();
    set(((event.clientX - rect.left) / rect.width) * 100);
  };
  range.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    range.focus({ preventScroll: true });
    range.setPointerCapture(event.pointerId);
    figure.dataset.dragging = "true";
    figure.dataset.touched = "true";
    fromPointer(event);
  });
  range.addEventListener("pointermove", (event) => {
    if (figure.dataset.dragging === "true") fromPointer(event);
  });
  const stop = () => delete figure.dataset.dragging;
  range.addEventListener("pointerup", stop);
  range.addEventListener("pointercancel", stop);
  range.addEventListener("lostpointercapture", stop);
  range.addEventListener("keydown", () => (figure.dataset.touched = "true"), { once: true });
  range.hidden = false;
  figure.dataset.caseSliderReady = "true";
  set(Number(range.value));
  new ResizeObserver(() => clearCorners(Number(range.value))).observe(stage);

  // One quick stepped nudge the first time it is seen, so it reads as something to drag.
  if (isMotionActive()) {
    const nudge = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      nudge.disconnect();
      const path = [50, 46, 42, 46, 50, 54, 58, 54, 50];
      path.forEach((value, at) => setTimeout(() => {
        if (figure.dataset.touched !== "true" && isMotionActive()) set(value);
      }, 500 + at * 40));
    }, { threshold: 0.6 });
    nudge.observe(stage);
  }

  const group = figure.querySelector("[data-case-slider-switch]");
  if (group) {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-case-slider-theme]");
      if (!button) return;
      pressOnly(group, button);
      figure.querySelectorAll("[data-case-slider-src]").forEach((image) => {
        image.src = image.dataset.caseSliderSrc.replace(figure.dataset.caseSliderToken || "{theme}", button.dataset.caseSliderTheme);
      });
    });
    group.hidden = false;
  }
}

// X-ray lens (component specimen 30 · B): a square window onto the second image follows the
// pointer in 8 px lattice steps and stays inside the picture; everything outside it is dimmed. The
// switch shows the whole x-ray for keyboard and touch.
function initLens(figure) {
  const stage = figure.querySelector(".case-lens__stage");
  const group = figure.querySelector("[data-case-lens-switch]");
  if (!stage) return;
  const PITCH = 8;
  // Until the reader moves over it, the lens waits on the top-left corner of the raised pane.
  let at = { x: 0.48, y: 0.18 };
  const place = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    const size = Math.max(96, Math.min(240, Math.round((width * 0.3) / PITCH) * PITCH));
    const snap = (value, max) => Math.max(0, Math.min(max, Math.round(value / PITCH) * PITCH));
    const left = snap(at.x * width - size / 2, width - size);
    const top = snap(at.y * height - size / 2, height - size);
    figure.style.setProperty("--lens", `${size}px`);
    figure.style.setProperty("--lens-l", `${left}px`);
    figure.style.setProperty("--lens-t", `${top}px`);
  };
  const move = (event) => {
    if (figure.hasAttribute("data-lens-full")) return;
    const rect = stage.getBoundingClientRect();
    at = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    place();
  };
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", move);
  new ResizeObserver(place).observe(stage);

  if (group) {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      pressOnly(group, button);
      figure.toggleAttribute("data-lens-full", button.hasAttribute("data-case-lens-toggle"));
    });
    group.hidden = false;
  }
  place();
  figure.dataset.lens = "on";
  figure.dataset.caseLensReady = "true";
}

// Deck embeds: visible previous and next buttons that press the deck's own arrow keys.
function initDeck(figure) {
  const bar = figure.querySelector("[data-case-deck]");
  const frame = figure.querySelector("iframe[data-case-live-src]");
  if (!bar || !frame) return;
  const total = bar.dataset.caseDeck;
  const count = bar.querySelector("[data-case-deck-count]");
  const read = () => {
    try {
      const [, query = ""] = frame.contentWindow.location.hash.split("?");
      const slide = new URLSearchParams(query).get("slide") || "1";
      count.textContent = `Slide ${slide} of ${total}`;
    } catch {
      // The deck has not loaded yet.
    }
  };
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow.addEventListener("hashchange", read);
    } catch {
      // Cross-origin decks keep their own controls.
    }
    read();
  });
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-case-deck-step]");
    if (!button) return;
    const key = button.dataset.caseDeckStep === "1" ? "ArrowRight" : "ArrowLeft";
    try {
      const doc = frame.contentDocument;
      doc.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true }));
      setTimeout(read, 60);
    } catch {
      // Nothing to press until the deck loads.
    }
  });
  bar.hidden = false;
}

// Scroll-driven embeds: progress through the tall section scrubs the embedded page.
function initScroll(figure) {
  const frame = figure.querySelector("iframe[data-case-live-src]");
  const meter = figure.querySelector(".case-scroll__meter span");
  if (!frame) return;
  let ticking = false;
  const progress = () => {
    const rect = figure.getBoundingClientRect();
    const sticky = figure.querySelector(".case-scroll__sticky");
    const travel = Math.max(1, rect.height - (sticky?.offsetHeight ?? 0));
    return Math.min(1, Math.max(0, -rect.top / travel + 0.04));
  };
  const push = () => {
    ticking = false;
    const p = progress();
    if (meter) meter.style.transform = `scaleX(${p})`;
    try {
      frame.contentWindow?.__treeProgress?.(isMotionActive() ? p : 1);
    } catch {
      // A cross-origin page cannot be scrubbed; it keeps its own motion.
    }
  };
  frame.addEventListener("load", () => {
    try {
      frame.contentWindow?.__treeDriven?.();
    } catch {
      // Same as above.
    }
    push();
  });
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(push);
    }
  }, { passive: true });
  figure.dataset.caseScrollReady = "true";
}

// The notice on interactive embeds steps away once the reader has used it.
function initHints(root) {
  root.querySelectorAll("[data-case-live-hint]").forEach((hint) => {
    const frame = hint.closest(".case-live__frame");
    const iframe = frame?.querySelector("iframe");
    const used = () => hint.setAttribute("data-used", "");
    frame?.addEventListener("pointerenter", used, { once: true });
    // Pointer events inside an embedded page never reach this page, so listen in the frame too.
    iframe?.addEventListener("load", () => {
      try {
        ["pointerdown", "pointermove"].forEach((type) => iframe.contentWindow?.addEventListener(type, used, { once: true }));
      } catch {
        // A cross-origin page keeps the notice until the reader leaves.
      }
    });
  });
}

export function initCaseMedia(root = document) {
  root.querySelectorAll("[data-case-scroll]").forEach(initScroll);
  initHints(root);
  root.querySelectorAll(".case-live:has([data-case-deck])").forEach(initDeck);
  root.querySelectorAll("[data-case-live-scaled]").forEach(initScaledFrame);
  root.querySelectorAll("[data-case-timeline]").forEach(initTimeline);
  root.querySelectorAll("[data-case-quotes]").forEach(initQuotes);
  root.querySelectorAll("[data-case-slider]").forEach(initSlider);
  root.querySelectorAll("[data-case-lens]").forEach(initLens);
  root.querySelectorAll("[data-case-compare]").forEach(initCompare);
  root.querySelectorAll("iframe[data-case-live-src]").forEach(initLiveFrame);
  root.querySelectorAll(".case-live--switcher").forEach(initLiveSwitcher);
  root.querySelectorAll("[data-case-gallery]").forEach(initGallery);
}

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  liveObserver?.disconnect();
});
