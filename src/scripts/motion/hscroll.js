// Sideways scroll, made visible. Any strip that scrolls horizontally gets faded edges where more
// content is hidden; galleries also get a quiet bar under them: previous, a position meter, the
// count and next. Nothing appears when a strip fits, so a resize that removes the overflow
// removes the cues too.
import { isMotionActive } from "./lifecycle.js";

const STRIPS = ".case-image-grid__items, .homepage-timeline__toc ol, [data-hscroll]";
const GALLERIES = ".case-image-grid__items, [data-hscroll='gallery']";
const seen = new WeakSet();

function step(strip) {
  const first = strip.firstElementChild;
  if (!first) return strip.clientWidth * 0.8;
  const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
  return first.getBoundingClientRect().width + gap;
}

function buildBar(strip) {
  const bar = document.createElement("div");
  bar.className = "hscroll-bar";
  bar.hidden = true;
  bar.innerHTML =
    '<button type="button" class="hscroll-bar__step" data-hscroll-step="-1" aria-label="Scroll back">←</button>' +
    '<span class="hscroll-bar__track" aria-hidden="true"><span class="hscroll-bar__thumb"></span></span>' +
    '<output class="hscroll-bar__count" aria-live="polite"></output>' +
    '<button type="button" class="hscroll-bar__step" data-hscroll-step="1" aria-label="Scroll forward">→</button>';
  strip.after(bar);
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hscroll-step]");
    if (!button) return;
    strip.scrollBy({ left: Number(button.dataset.hscrollStep) * step(strip), behavior: isMotionActive() ? "smooth" : "auto" });
  });
  return bar;
}

function initStrip(strip) {
  if (seen.has(strip)) return;
  seen.add(strip);
  const bar = strip.matches(GALLERIES) ? buildBar(strip) : null;
  const thumb = bar?.querySelector(".hscroll-bar__thumb");
  const count = bar?.querySelector(".hscroll-bar__count");
  const [back, forward] = bar ? bar.querySelectorAll("[data-hscroll-step]") : [];
  let frame = 0;

  const sync = () => {
    frame = 0;
    const max = strip.scrollWidth - strip.clientWidth;
    const overflowing = max > 4;
    const atStart = strip.scrollLeft <= 2;
    const atEnd = strip.scrollLeft >= max - 2;
    strip.dataset.hscrollState = !overflowing ? "fits" : atStart ? "start" : atEnd ? "end" : "middle";
    if (!bar) return;
    bar.hidden = !overflowing;
    if (!overflowing) return;
    const ratio = strip.clientWidth / strip.scrollWidth;
    thumb.style.width = `${ratio * 100}%`;
    thumb.style.transform = `translateX(${(strip.scrollLeft / Math.max(1, max)) * ((1 - ratio) / ratio) * 100}%)`;
    const items = strip.children.length;
    const current = Math.min(items, Math.round(strip.scrollLeft / step(strip)) + 1);
    count.textContent = `${current} / ${items}`;
    back.disabled = atStart;
    forward.disabled = atEnd;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(sync);
  };
  strip.addEventListener("scroll", schedule, { passive: true });
  new ResizeObserver(schedule).observe(strip);
  sync();
}

export function initHScroll(root = document) {
  root.querySelectorAll(STRIPS).forEach(initStrip);
}
