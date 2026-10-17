const query = document.querySelector("[data-notes-query]");
const list = document.querySelector("[data-notes-list]");
const count = document.querySelector("[data-notes-count]");
const empty = document.querySelector("[data-notes-empty]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// The empty state's cell icon: a small block of mixed densities.
const emptyIcon = document.querySelector("[data-notes-empty-icon]");
if (emptyIcon instanceof HTMLElement) {
  emptyIcon.style.setProperty("--cells", "3");
  [1, 3, 5, 3, 6, 8, 5, 8, 8].forEach((level) => {
    const cell = document.createElement("i");
    cell.className = "cell";
    cell.dataset.level = String(level);
    emptyIcon.append(cell);
  });
}

// Rows that come back into the list snap in, staggered along an ease-out curve.
const snapIn = (rows) => {
  const state = document.documentElement.dataset.motionState;
  if (reducedMotion.matches || (state && state !== "active")) return;
  rows.forEach((row, index) => {
    const t = rows.length > 1 ? index / (rows.length - 1) : 0;
    row.style.setProperty("--mark-delay", `${Math.round(240 * (1 - Math.pow(1 - t, 3)))}ms`);
    row.classList.remove("is-snapping");
    void row.offsetWidth;
    row.classList.add("is-snapping");
    row.addEventListener("animationend", () => row.classList.remove("is-snapping"), { once: true });
  });
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

    const animate = !reducedMotion.matches && (document.documentElement.dataset.motionState || "active") === "active";
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
        // Rows that stop matching leave with the afterglow (100 → 55 → 20 → 0), then hide.
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
    count.value = terms.length > 0 ? `${visible} ${visible === 1 ? "note" : "notes"}` : "";
    empty.hidden = visible > 0;
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
