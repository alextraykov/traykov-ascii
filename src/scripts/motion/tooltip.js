// Tooltip (picks, A): a small ink label with paper text, 6 px from the control, for icon-only
// controls. It shows after a 300 ms hover rest (at once when another tooltip closed less than
// 400 ms ago) or at once on keyboard focus; Escape hides it; it appears and leaves in one step.
// `[data-tooltip]` hosts keep `title` as the no-JS fallback: this moves the title into the tooltip
// (and keeps following it when the owner rewrites it). The accessible name is never the tooltip;
// the tooltip only describes (aria-describedby).
let lastClosed = -Infinity;
let counter = 0;
const open = new Set();

function place(host, tip) {
  const rect = host.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const gap = 6;
  const above = rect.top - gap - tipRect.height;
  const top = above >= 4 ? above : rect.bottom + gap;
  const left = Math.min(
    Math.max(4, rect.left + rect.width / 2 - tipRect.width / 2),
    document.documentElement.clientWidth - tipRect.width - 4
  );
  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

function enhance(host) {
  if (!(host instanceof HTMLElement) || host.dataset.tooltipReady === "true") return;
  host.dataset.tooltipReady = "true";

  const tip = document.createElement("span");
  tip.className = "pick-tooltip";
  tip.id = `pick-tooltip-${(counter += 1)}`;
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);

  const describedBy = (host.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  host.setAttribute("aria-describedby", [...describedBy, tip.id].join(" "));

  const adopt = () => {
    const title = host.getAttribute("title");
    if (title == null) return;
    tip.textContent = title || host.dataset.tooltip || "";
    host.removeAttribute("title");
  };
  if (!host.getAttribute("title") && host.dataset.tooltip) host.setAttribute("title", host.dataset.tooltip);
  adopt();
  new MutationObserver(adopt).observe(host, { attributes: true, attributeFilter: ["title"] });

  let wait = 0;
  const show = () => {
    window.clearTimeout(wait);
    if (!tip.textContent) return;
    tip.hidden = false;
    place(host, tip);
    open.add(hide);
  };
  const hide = () => {
    window.clearTimeout(wait);
    if (!tip.hidden) lastClosed = performance.now();
    tip.hidden = true;
    open.delete(hide);
  };

  host.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    window.clearTimeout(wait);
    wait = window.setTimeout(show, performance.now() - lastClosed < 400 ? 0 : 300);
  });
  host.addEventListener("pointerleave", () => {
    if (!host.matches(":focus-visible")) hide();
  });
  host.addEventListener("focus", () => {
    if (host.matches(":focus-visible")) show();
  });
  host.addEventListener("blur", hide);
  host.addEventListener("click", () => {
    // The owner may rewrite the title on click (the theme control); keep the label current.
    if (!tip.hidden) requestAnimationFrame(() => place(host, tip));
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") open.forEach((hide) => hide());
});
window.addEventListener("scroll", () => open.forEach((hide) => hide()), { passive: true });

export function initTooltips(root = document) {
  root.querySelectorAll("[data-tooltip]").forEach(enhance);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initTooltips(), { once: true });
else initTooltips();
