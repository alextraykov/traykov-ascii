// Round 3 simple marks: dithered cells, the curved stagger scheduler, the dither fill and cell icons.
// Steps inside, curves across: each mark changes in discrete steps; delays across marks follow a curve.
// Levels are drawn by CSS (global.css "16 SIMPLE MARKS"); this module only changes data-level.
import { isMotionActive } from "./lifecycle.js";

export const curves = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  linear: (x) => x
};

function readMs(token, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return fallback;
  return value.endsWith("s") && !value.endsWith("ms") ? number * 1000 : number;
}

export const timing = {
  get step() {
    return readMs("--step", 30);
  },
  get total() {
    return readMs("--stagger-total", 600);
  }
};

export function setLevel(cell, level) {
  const next = String(Math.max(0, Math.min(8, Math.round(level))));
  if (cell.dataset.level !== next) cell.dataset.level = next;
}

export function createCells(host, count, { clear = false, level = 0 } = {}) {
  const cells = [];
  for (let index = 0; index < count; index += 1) {
    const cell = document.createElement("i");
    cell.className = clear ? "cell cell--clear" : "cell";
    cell.dataset.level = String(level);
    cell.setAttribute("aria-hidden", "true");
    host.append(cell);
    cells.push(cell);
  }
  return cells;
}

// Delays are computed once from normalised order values (0…1); one rAF loop runs only while marks move.
export function runField({ values, total = timing.total, curve = curves.out, steps, stepMs = timing.step, render, done }) {
  if (!isMotionActive()) {
    render(() => steps);
    if (done) done();
    return () => {};
  }
  const delays = values.map((value) => total * curve(Math.min(1, Math.max(0, value))));
  const end = Math.max(0, ...delays) + steps * stepMs;
  const start = performance.now();
  let frame = 0;
  const tick = (now) => {
    const elapsed = now - start;
    render((index) => Math.min(steps, Math.floor((elapsed - delays[index]) / stepMs)));
    if (elapsed < end) frame = requestAnimationFrame(tick);
    else if (done) done();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

const orderValue = (order, x, y, cols, rows, origin) => {
  if (order === "point" && origin) return Math.hypot(x - origin.x * cols, y - origin.y * rows) / Math.hypot(cols, rows);
  if (order === "reading") return x / Math.max(1, cols - 1);
  return (x + y) / Math.max(1, cols + rows - 2);
};

// The dither fill behind a control (the press). The element gets .is-filled when solid so no seams show.
export function fillLayer(element, { size = 12 } = {}) {
  const layer = document.createElement("span");
  layer.className = "fill-layer";
  layer.setAttribute("aria-hidden", "true");
  element.prepend(layer);
  let cells = [];
  let levels = [];
  let cols = 0;
  let rows = 0;
  let stop = () => {};
  let token = 0;

  const build = () => {
    const rect = element.getBoundingClientRect();
    cols = Math.max(1, Math.ceil(rect.width / size));
    rows = Math.max(1, Math.ceil(rect.height / size));
    layer.style.setProperty("--fill-cell", `${size}px`);
    layer.textContent = "";
    cells = createCells(layer, cols * rows, { clear: true });
    levels = cells.map(() => 0);
  };

  const to = (level, { order = "diagonal", origin = null, total = 240, done } = {}) => {
    const rect = element.getBoundingClientRect();
    if (!cells.length || Math.ceil(rect.width / size) !== cols || Math.ceil(rect.height / size) !== rows) build();
    stop();
    const current = (token += 1);
    element.classList.remove("is-filled");
    element.classList.add("is-filling");
    const from = levels.slice();
    const finish = () => {
      cells.forEach((cell, index) => {
        levels[index] = level;
        setLevel(cell, level);
      });
      if (level === 8) element.classList.add("is-filled");
      if (level === 0) element.classList.remove("is-filling");
      if (done) done();
    };
    stop = runField({
      values: cells.map((_, index) => orderValue(order, index % cols, Math.floor(index / cols), cols, rows, origin)),
      total,
      steps: 8,
      stepMs: 16,
      render: (stepAt) => {
        if (current !== token) return;
        cells.forEach((cell, index) => {
          const progress = Math.min(1, Math.max(0, stepAt(index) + 1) / 8);
          const value = Math.round(from[index] + (level - from[index]) * progress);
          if (levels[index] !== value) {
            levels[index] = value;
            setLevel(cell, value);
          }
        });
      },
      done: () => {
        if (current === token) finish();
      }
    });
  };

  return { to };
}

// 5×5 (or 5×3) cell icons. "#" solid, "+" 5, ":" 3, "." empty.
const LEVEL_OF = { "#": 8, "+": 5, ":": 3, ".": 0 };
export const ICONS = {
  check: ["....#", "...##", "#.##.", "###..", ".#..."],
  play: ["#....", "###..", "#####", "###..", "#...."],
  pause: ["##.##", "##.##", "##.##", "##.##", "##.##"],
  menu: ["#####", ".....", "#####", ".....", "#####"],
  close: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  chevron: ["#...#", ".#.#.", "..#.."],
  chevronUp: ["..#..", ".#.#.", "#...#"],
  upload: ["..#..", ".###.", "#.#.#", "..#..", "#####"],
  themeLight: ["#####", "#..##", "#..##", "#..##", "#####"],
  themeDark: ["#####", "##..#", "##..#", "##..#", "#####"]
};

export function createIcon(host, name, { cell = 3 } = {}) {
  const pattern = ICONS[name];
  host.classList.add("cell-icon");
  host.style.setProperty("--cells", pattern[0].length);
  host.style.setProperty("--icon-cell", `${cell}px`);
  host.setAttribute("aria-hidden", "true");
  host.textContent = "";
  const cells = createCells(host, pattern.length * pattern[0].length, { clear: true });
  pattern.join("").split("").forEach((symbol, index) => setLevel(cells[index], LEVEL_OF[symbol]));
  host._cells = cells;
  host._width = pattern[0].length;
  return host;
}

export function morphIcon(host, name) {
  const target = ICONS[name].join("").split("").map((symbol) => LEVEL_OF[symbol]);
  const cells = host._cells || [];
  const from = cells.map((cell) => Number(cell.dataset.level));
  const width = host._width || 5;
  runField({
    values: cells.map((_, index) => ((index % width) + Math.floor(index / width)) / (width * 2)),
    total: 120,
    steps: 3,
    render: (stepAt) => cells.forEach((cell, index) => {
      const progress = Math.min(1, Math.max(0, stepAt(index) + 1) / 3);
      setLevel(cell, from[index] + (target[index] - from[index]) * progress);
    })
  });
}
