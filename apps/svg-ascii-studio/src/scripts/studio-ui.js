// UI layer for the SVG → 3D ASCII studio (round 3, picks batch 3). The engine (studio.js) owns
// rendering and state; this only draws the step strip, the cell tracks behind the real range inputs,
// the drop zone (A: cell upload icon, drag-over border), the colour swatches (A: radios that write
// into the engine's native colour inputs) and the export ladder (A: Exporting → Saved). It never
// reads or writes engine state except through the inputs the engine already listens to.
const root = document.querySelector(".studio2[data-studio]");

if (root) {
  // Ordered 4×4 dither masks for eight cell levels, shared by the CSS as --s2-d1…7.
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let k = 1; k <= 7; k += 1) {
    let rects = "";
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        if (BAYER[y][x] < k * 2) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4" shape-rendering="crispEdges">${rects}</svg>`;
    root.style.setProperty(`--s2-d${k}`, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }

  // Step strip: solid = done, dither = where you are, empty = not yet.
  const steps = [...root.querySelectorAll("[data-s2-step]")];
  const done = { add: false, look: false, export: false };
  const paintSteps = () => {
    const loaded = root.dataset.sourceState === "sample" || root.dataset.sourceState === "uploaded";
    done.add = loaded;
    if (!loaded) {
      done.look = false;
      done.export = false;
    }
    const order = ["add", "look", "export"];
    const now = order.find((key) => !done[key]);
    steps.forEach((step) => {
      const key = step.dataset.s2Step;
      step.classList.toggle("is-done", done[key]);
      step.classList.toggle("is-now", key === now);
      if (key === now) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };
  new MutationObserver(paintSteps).observe(root, { attributes: true, attributeFilter: ["data-source-state"] });
  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-preset]")) done.look = true;
    if (event.target.closest("[data-download-png], [data-copy-ascii], .s2-formats button, .s2-share button")) {
      done.look = true;
      done.export = true;
    }
    paintSteps();
  });
  root.addEventListener("input", (event) => {
    if (event.target.matches(".s2-adjust [data-control]")) {
      done.look = true;
      paintSteps();
    }
  });
  paintSteps();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOn = () =>
    !reduceMotion.matches &&
    (typeof window.__traykovMotion?.isActive !== "function" || window.__traykovMotion.isActive());

  // 5 × 5 cell icons ("#" solid, "." empty) at 3 px cells.
  const ICONS = {
    upload: ["..#..", ".###.", "#.#.#", "..#..", "#####"],
    check: ["....#", "...##", "#.##.", "###..", ".#..."]
  };
  const drawIcon = (host, name) => {
    host.classList.add("s2-icon");
    host.setAttribute("aria-hidden", "true");
    host.replaceChildren(
      ...ICONS[name].join("").split("").map((symbol) => {
        const cell = document.createElement("i");
        cell.dataset.l = symbol === "#" ? "8" : "0";
        return cell;
      })
    );
    return host;
  };

  // Drop zone (A): the cell upload icon; drag-over draws the 2 px ink border in one step.
  root.querySelectorAll(".s2-upload").forEach((icon) => drawIcon(icon, "upload"));
  root.querySelectorAll("[data-stage-drop-target], [data-dropzone]").forEach((target) => {
    let depth = 0;
    const set = (on) => target.classList.toggle("is-over", on);
    target.addEventListener("dragenter", () => {
      depth += 1;
      set(true);
    });
    target.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (!depth) set(false);
    });
    ["drop", "dragend"].forEach((name) =>
      target.addEventListener(name, () => {
        depth = 0;
        set(false);
      })
    );
  });

  // Loaded: the green cell check before the file name in the bar.
  const sourceName = root.querySelector("[data-source-name]");
  if (sourceName) {
    const check = drawIcon(document.createElement("span"), "check");
    check.classList.add("s2-icon--ok");
    sourceName.before(check);
  }

  // Swatches (A): Ink, Stone, Green, Rust, Paper as radios. Choosing one writes its colour into the
  // engine's native colour input and dispatches input + change; "Other…" opens the native picker.
  const SWATCHES = [
    ["Ink", "#080808"],
    ["Stone", "#747064"],
    ["Green", "#04764e"],
    ["Rust", "#b8421f"],
    ["Paper", "#fbfbf8"]
  ];
  const swatchRows = [...root.querySelectorAll("[data-swatches]")].map((row) => {
    const input = row.querySelector('input[type="color"][data-control]');
    const group = row.querySelector(".s2-swatches");
    if (!(input instanceof HTMLInputElement) || !(group instanceof HTMLElement)) return () => {};
    const name = `s2-swatch-${row.dataset.swatches}`;
    const radios = SWATCHES.map(([label, value]) => {
      const option = document.createElement("label");
      option.className = "s2-swatch";
      option.style.setProperty("--swatch", value);
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      radio.value = value;
      const text = document.createElement("span");
      text.className = "s2-vh";
      text.textContent = label;
      option.append(radio, text);
      group.append(option);
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      return radio;
    });
    group.hidden = false;
    row.classList.add("is-enhanced");
    const sync = () => {
      const value = input.value.toLowerCase();
      radios.forEach((radio) => {
        radio.checked = radio.value === value;
      });
      // Keep one radio in the tab order even when the colour is custom.
      if (!radios.some((radio) => radio.checked)) radios.forEach((radio, index) => (radio.tabIndex = index ? -1 : 0));
      else radios.forEach((radio) => radio.removeAttribute("tabindex"));
    };
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    sync();
    return sync;
  });
  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-preset], [data-reset-preset], [data-load-sample], [data-clear-source]")) {
      requestAnimationFrame(() => requestAnimationFrame(() => swatchRows.forEach((sync) => sync())));
    }
  });

  // Export ladder (A primary): the press, then "Exporting" with the quarter turn, then the check and
  // "Saved" held for 1.5 s. The engine reports failures in the status line (is-error); success is the
  // absence of one. No progress cell: the engine has no real progress to show.
  const exportButton = root.querySelector("[data-download-png]");
  const statusLine = root.querySelector("[data-status]");
  if (exportButton instanceof HTMLButtonElement) {
    const word = document.createElement("span");
    word.className = "s2-press-word";
    word.textContent = exportButton.textContent.trim();
    const sign = document.createElement("span");
    sign.className = "s2-press-sign";
    sign.setAttribute("aria-hidden", "true");
    sign.hidden = true;
    const fill = document.createElement("span");
    fill.className = "s2-press-fill";
    fill.setAttribute("aria-hidden", "true");
    exportButton.replaceChildren(fill, sign, word);
    const live = document.createElement("span");
    live.className = "s2-vh";
    live.setAttribute("aria-live", "polite");
    exportButton.after(live);
    const rest = word.textContent;
    const quarter = Array.from({ length: 4 }, () => document.createElement("i"));
    let timers = [];
    let spin = 0;
    const clear = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
      window.clearInterval(spin);
    };
    const paintQuarter = (tick) => {
      const head = Math.floor(tick / 3) % 4;
      [0, 1, 3, 2].forEach((index, place) => {
        quarter[index].dataset.l = place === head ? "8" : place === (head + 3) % 4 ? "3" : "0";
      });
    };
    exportButton.addEventListener("click", () => {
      if (exportButton.disabled) return;
      clear();
      exportButton.classList.remove("is-pressing");
      if (motionOn()) {
        void exportButton.offsetWidth;
        exportButton.classList.add("is-pressing");
      }
      const failedBefore = statusLine?.classList.contains("is-error") && statusLine.textContent;
      exportButton.dataset.state = "working";
      sign.className = "s2-press-sign s2-quarter";
      sign.replaceChildren(...quarter);
      sign.hidden = false;
      word.textContent = "Exporting";
      live.textContent = "Exporting PNG";
      let tick = 0;
      paintQuarter(0);
      if (motionOn()) spin = window.setInterval(() => paintQuarter((tick += 1)), 40);
      timers.push(
        window.setTimeout(() => {
          window.clearInterval(spin);
          const failed = statusLine?.classList.contains("is-error") && statusLine.textContent !== failedBefore;
          if (failed) {
            delete exportButton.dataset.state;
            sign.hidden = true;
            word.textContent = rest;
            live.textContent = "";
            return;
          }
          exportButton.dataset.state = "done";
          drawIcon(sign, "check");
          sign.className = "s2-press-sign s2-icon s2-icon--ok";
          word.textContent = "Saved";
          live.textContent = "PNG saved";
          timers.push(
            window.setTimeout(() => {
              delete exportButton.dataset.state;
              sign.hidden = true;
              word.textContent = rest;
            }, 1500)
          );
        }, 480)
      );
    });
    exportButton.addEventListener("animationend", () => exportButton.classList.remove("is-pressing"));
  }

  // Cell tracks: the native range stays on top (invisible) for keyboard and assistive tech.
  root.querySelectorAll('input[type="range"][data-control]').forEach((input) => {
    const track = document.createElement("span");
    track.className = "s2-range";
    const cells = Array.from({ length: 24 }, () => {
      const cell = document.createElement("i");
      cell.dataset.l = "0";
      track.append(cell);
      return cell;
    });
    input.replaceWith(track);
    track.append(input);
    const paint = () => {
      const min = Number(input.min);
      const max = Number(input.max);
      const x = ((Number(input.value) - min) / (max - min)) * cells.length;
      cells.forEach((cell, index) => {
        const fill = x - index;
        cell.dataset.l = String(fill >= 1 ? 8 : fill <= 0 ? 0 : Math.ceil(fill * 8));
      });
    };
    input.addEventListener("input", paint);
    input.addEventListener("change", paint);
    // The engine may set values programmatically (presets, restore); repaint after it settles.
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-preset], [data-reset-preset], [data-load-sample], [data-clear-source]")) {
        requestAnimationFrame(() => requestAnimationFrame(paint));
      }
    });
    paint();
  });
}
