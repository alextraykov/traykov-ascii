// Loaders (picks, B): cell signals on the shared 40 ms tick, all aria-hidden (the owner puts a plain
// word beside each in a polite region). Every loader stops on a meaningful still frame when motion
// is off or the visitor pauses it, never on frame 0.
//   loader(host, "quarter" | "sweep" | "breathe", options) → stop()
// - quarter: a 2 × 2 quarter turn, the head moving every `every` ticks with a level-3 tail.
// - sweep: a band (3·6·3) walking a row of `n` cells one cell per tick; rests with every cell at 3.
// - breathe: a block of cols × rows cells; a diagonal wave walks the `wave` levels one step every
//   `every` ticks. The Notes empty state uses 5 × 3, wave 1·2·3·2, every 3, resting on a 1·2·3 diagonal.
// - bar: a dither bar of `n` cells (12) filled to `value` (0…1), the leading cell dithered to the
//   fraction. It shows real progress only: the returned stop() carries set(value) for the owner.
import { createCells, setLevel } from "./cells.js";
import { isMotionActive, onMotionChange } from "./lifecycle.js";
import { onTick } from "./tick.js";

const mod = (value, size) => ((value % size) + size) % size;

export function loader(host, kind = "quarter", options = {}) {
  if (!(host instanceof HTMLElement)) return () => {};
  host.textContent = "";
  host.classList.add("cells", "loader", `loader--${kind}`);
  host.setAttribute("aria-hidden", "true");
  const size = options.cell || 7;
  host.style.setProperty("--cell-size", `${size}px`);
  host.style.setProperty("--cell-gap", "1px");

  let frame;
  let rest;
  if (kind === "quarter") {
    const every = options.every || 2;
    host.style.setProperty("--cells", "2");
    const list = createCells(host, 4);
    const order = [0, 1, 3, 2];
    frame = (tick) => {
      const head = Math.floor(tick / every) % 4;
      order.forEach((index, place) => setLevel(list[index], place === head ? 8 : place === (head + 3) % 4 ? 3 : 0));
    };
    rest = () => frame(0);
  } else if (kind === "breathe") {
    const cols = options.cols || 3;
    const rows = options.rows || 3;
    const wave = options.wave || [1, 3, 5, 3, 1];
    const every = options.every || 2;
    host.style.setProperty("--cells", String(cols));
    const list = createCells(host, cols * rows);
    const diagonal = (index) => (index % cols) + Math.floor(index / cols);
    frame = (tick) => list.forEach((cell, index) => setLevel(cell, wave[mod(Math.floor(tick / every) - diagonal(index), wave.length)]));
    rest =
      options.rest === "diagonal"
        ? () => list.forEach((cell, index) => setLevel(cell, 1 + (diagonal(index) % 3)))
        : () => list.forEach((cell) => setLevel(cell, options.rest ?? 3));
  } else if (kind === "bar") {
    const n = options.n || 12;
    host.style.setProperty("--cells", String(n));
    const list = createCells(host, n);
    let value = Math.max(0, Math.min(1, options.value || 0));
    const paint = () => list.forEach((cell, index) => {
      const x = value * n - index;
      setLevel(cell, x >= 1 ? 8 : x <= 0 ? 0 : Math.ceil(x * 8));
    });
    paint();
    const stop = () => paint();
    stop.set = (next) => {
      value = Math.max(0, Math.min(1, Number(next) || 0));
      paint();
    };
    return stop;
  } else {
    const n = options.n || 12;
    const band = options.band || [3, 6, 3];
    host.style.setProperty("--cells", String(n));
    const list = createCells(host, n);
    frame = (tick) => {
      const head = (tick % (n + band.length)) - band.length;
      list.forEach((cell, index) => {
        const offset = index - head;
        setLevel(cell, offset >= 0 && offset < band.length ? band[offset] : 0);
      });
    };
    rest = () => list.forEach((cell) => setLevel(cell, options.rest ?? 3));
  }

  rest();
  const stopTick = onTick(host, (tick) => {
    if (isMotionActive()) frame(tick);
  });
  const stopMotion = onMotionChange((state) => {
    if (!state.active) rest();
  });
  return () => {
    stopTick();
    stopMotion();
    rest();
  };
}
