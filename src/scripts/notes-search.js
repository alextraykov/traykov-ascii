const query = document.querySelector("[data-notes-query]");
const list = document.querySelector("[data-notes-list]");
const count = document.querySelector("[data-notes-count]");
const empty = document.querySelector("[data-notes-empty]");

if (
  query instanceof HTMLInputElement &&
  list instanceof HTMLElement &&
  count instanceof HTMLOutputElement &&
  empty instanceof HTMLElement
) {
  const items = Array.from(list.querySelectorAll("[data-note-slug]"));
  let indexPromise;

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
    const terms = normalize(query.value).trim().split(/\s+/).filter(Boolean);
    const index = terms.length > 0 ? await loadIndex() : new Map();
    let visible = 0;

    items.forEach((item) => {
      const slug = item.getAttribute("data-note-slug") ?? "";
      const haystack = index.get(slug) ?? "";
      const matches = terms.length === 0 || terms.every((term) => haystack.includes(term));
      item.toggleAttribute("hidden", !matches);
      if (matches) visible += 1;
    });

    count.value = `${visible} / ${items.length}`;
    empty.hidden = visible > 0;
  };

  query.addEventListener("input", () => {
    filter().catch(() => {
      count.value = "SEARCH UNAVAILABLE";
    });
  });
}
