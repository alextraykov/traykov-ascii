import { loader } from "./motion/loader.js";

const query = document.querySelector("[data-notes-query]");
const list = document.querySelector("[data-notes-list]");
const count = document.querySelector("[data-notes-count]");
const empty = document.querySelector("[data-notes-empty]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionOn = () => !reducedMotion.matches && (document.documentElement.dataset.motionState || "active") === "active";

// The empty state (picks, B): a 5 × 3 block of 7 px cells breathing on the shared tick, a diagonal
// wave 1 → 2 → 3 → 2 one step every 3 ticks; at rest and with motion off a fixed 1·2·3 diagonal.
const emptyIcon = document.querySelector("[data-notes-empty-icon]");
if (emptyIcon instanceof HTMLElement) {
  loader(emptyIcon, "breathe", { cols: 5, rows: 3, wave: [1, 2, 3, 2], every: 3, rest: "diagonal" });
}

// Rows that come back into the list snap in with the A stagger: cumulative gaps of 70, 55, 45, 40,
// 35, 30 ms, so the first row gets the most time and the group lands inside 400 ms.
const STAGGER_DELAYS = [0, 70, 125, 170, 210, 245, 275];
const snapIn = (rows) => {
  if (!motionOn()) return;
  rows.forEach((row, index) => {
    row.style.setProperty("--mark-delay", `${STAGGER_DELAYS[Math.min(index, STAGGER_DELAYS.length - 1)]}ms`);
    row.classList.remove("is-snapping");
    void row.offsetWidth;
    row.classList.add("is-snapping");
    row.addEventListener("animationend", () => row.classList.remove("is-snapping"), { once: true });
  });
};

// The A afterglow (120 ms, 55 % then gone) that rows leave with; the empty state waits for it.
const afterglowMs = () => {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--afterglow-a"));
  return Number.isFinite(value) ? value : 120;
};

if (
  query instanceof HTMLInputElement &&
  list instanceof HTMLElement &&
  count instanceof HTMLOutputElement &&
  empty instanceof HTMLElement
) {
  const items = Array.from(list.querySelectorAll("[data-note-slug]"));
  let indexPromise;
  let filterVersion = 0;
  let emptyTimer = 0;

  const normalize = (value) =>
    value
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "");

  const loadIndex = () => {
    indexPromise ??= fetch("/notes/search.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json();
      })
      .then((entries) =>
        new Map(
          entries.map((entry) => [
            entry.slug,
            normalize([entry.title, entry.summary, entry.tags.join(" "), entry.text].join(" "))
          ])
        )
      );

    return indexPromise;
  };

  const filter = async () => {
    const version = ++filterVersion;
    const terms = normalize(query.value).trim().split(/\s+/).filter(Boolean);
    let index;
    try {
      index = terms.length > 0 ? await loadIndex() : new Map();
    } catch (error) {
      if (version === filterVersion) throw error;
      return;
    }
    if (version !== filterVersion) return;
    let visible = 0;
    const returning = [];

    const animate = motionOn();
    items.forEach((item) => {
      const slug = item.getAttribute("data-note-slug") ?? "";
      const haystack = index.get(slug) ?? "";
      const matches = terms.length === 0 || terms.every((term) => haystack.includes(term));
      if (matches) {
        item.classList.remove("is-leaving");
        if (item.hidden) returning.push(item);
        item.hidden = false;
        visible += 1;
      } else if (!item.hidden && !item.classList.contains("is-leaving")) {
        // Rows that stop matching leave with the A afterglow (55 % → 0 in 120 ms), then hide.
        if (!animate) {
          item.hidden = true;
        } else {
          item.classList.add("is-leaving");
          item.addEventListener(
            "animationend",
            () => {
              if (!item.classList.contains("is-leaving")) return;
              item.classList.remove("is-leaving");
              item.hidden = true;
            },
            { once: true }
          );
        }
      }
    });
    snapIn(returning);

    count.hidden = terms.length === 0;
    const words = visible === 0 ? "No notes match" : `${visible} ${visible === 1 ? "note" : "notes"}`;
    const nextCount = terms.length > 0 ? words : "";
    if (count.value !== nextCount) count.value = nextCount;
    window.clearTimeout(emptyTimer);
    if (visible > 0 || !animate) {
      empty.hidden = visible > 0;
    } else if (empty.hidden) {
      // The empty state appears once the leaving rows have finished their afterglow.
      emptyTimer = window.setTimeout(() => {
        if (version === filterVersion) empty.hidden = false;
      }, afterglowMs());
    }
    const emptyText = empty.querySelector("[data-notes-empty-text]");
    if (emptyText) emptyText.textContent = `No notes about “${query.value.trim()}” yet. Try a shorter word.`;
  };

  query.addEventListener("input", () => {
    filter().catch(() => {
      count.hidden = false;
      count.value = "Search isn’t available right now";
    });
  });

  const disclosure = query.closest("details");
  disclosure?.addEventListener("toggle", () => {
    if (disclosure.open || !query.value) return;
    query.value = "";
    filter().catch(() => {
      count.hidden = true;
      count.value = "";
    });
  });
}
