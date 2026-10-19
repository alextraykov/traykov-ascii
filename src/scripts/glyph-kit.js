// Glyph kit Labs page: the deck player.

// Deck player: one slide at a time inside the demo frame. Next walks a slide's steps (lighting the
// lines each one talks about), then moves on.
document.querySelectorAll("[data-gk-player]").forEach((player) => {
  const count = player.querySelector("[data-gk-player-count]");
  const say = player.querySelector("[data-gk-say]");
  const sourceOut = player.querySelector("[data-gk-source-out]");
  const panel = player.querySelector(".gk-player__deck");
  let slide = 0;
  let step = 0;

  player.dataset.ready = "true";
  player.querySelector("[data-gk-player-controls]").hidden = false;

  const slides = () => [...panel.querySelectorAll("[data-gk-slide]")];
  const stepsOf = (el) => JSON.parse(el.dataset.steps || "[]");

  // Fit each figure to its slide: Departure Mono at 22px when it fits, 11px when it doesn't.
  const fit = (el) => {
    const fig = el.querySelector("[data-gk-sl-figure]");
    if (!fig) return;
    fig.classList.add("is-large");
    if (fig.scrollWidth > fig.clientWidth + 1 || fig.scrollHeight > el.clientHeight * 0.62) fig.classList.remove("is-large");
  };

  const render = () => {
    const list = slides();
    list.forEach((el, i) => (el.hidden = i !== slide));
    const el = list[slide];
    fit(el);
    const steps = stepsOf(el);
    const target = step > 0 ? steps[step - 1] : null;
    const fig = el.querySelector("[data-gk-sl-figure]");
    if (fig) {
      fig.classList.toggle("is-focused", Boolean(target));
      fig.querySelectorAll(".gk-sl-line").forEach((line) => {
        const n = Number(line.dataset.l);
        line.classList.toggle("is-focus", Boolean(target) && n >= target.lines[0] && n <= target.lines[1]);
      });
    }
    say.textContent = target ? `► ${target.say}` : el.querySelector("[data-gk-notes]")?.innerHTML.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") || "";
    const src = el.querySelector("[data-gk-source]")?.innerHTML.replace(/&amp;/g, "&") ?? "";
    sourceOut.textContent = src ? `Source: ${src}` : "";
    count.textContent = `${String(slide + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}${steps.length ? ` · step ${step} of ${steps.length}` : ""}`;
  };

  const go = (dir) => {
    const list = slides();
    const steps = stepsOf(list[slide]).length;
    if (dir > 0) {
      if (step < steps) step += 1;
      else if (slide < list.length - 1) {
        slide += 1;
        step = 0;
      }
    } else if (step > 0) step -= 1;
    else if (slide > 0) {
      slide -= 1;
      step = stepsOf(list[slide]).length;
    }
    render();
  };

  player.querySelector("[data-gk-next]").addEventListener("click", () => go(1));
  player.querySelector("[data-gk-prev]").addEventListener("click", () => go(-1));
  player.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") (e.preventDefault(), go(1));
    if (e.key === "ArrowLeft") (e.preventDefault(), go(-1));
  });
  render();
});
