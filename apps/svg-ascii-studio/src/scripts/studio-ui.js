// UI layer for the SVG → 3D ASCII studio (round 3). The engine (studio.js) owns rendering and state;
// this only draws the step strip and the cell tracks behind the real range inputs.
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
