// The price of pace as a character diagram: what we pay (expertise, time) flows through trust
// and pace into what we get (craft, quickly). Packets step along the lines on the shared tick;
// every packet that reaches craft fills one cell of the meter under it, and a full meter holds,
// then clears. The note page and the video export both draw through this module.

// Arrowheads come from the same font as the box lines so horizontal and vertical ends match.
const HEADS = { right: "▸", left: "◂", down: "▾", up: "▴" };
const TRAIL = ["▓", "▒", "░"];
const EMPTY = "·";

export const STEP_TICKS = 3;
const SPACING = 6;
// The meter fills in eight arrivals, holds for three, then clears.
const METER_ARRIVALS = 8;
const HOLD_ARRIVALS = 3;
export const CYCLE_STEPS = (METER_ARRIVALS + HOLD_ARRIVALS) * SPACING;

class Grid {
  constructor(rows, cols) {
    this.cells = Array.from({ length: rows }, () => Array(cols).fill(" "));
  }

  put(row, col, char) {
    if (this.cells[row]?.[col] !== undefined) this.cells[row][col] = char;
  }

  text(row, col, value) {
    [...value].forEach((char, index) => this.put(row, col + index, char));
  }

  // Boxes are three rows tall so every node shares one centre line.
  box(row, col, label, width) {
    const inner = width - 2;
    const left = Math.floor((inner - label.length) / 2);
    this.text(row, col, `┌${"─".repeat(inner)}┐`);
    this.text(row + 1, col, `│${" ".repeat(left)}${label}${" ".repeat(inner - left - label.length)}│`);
    this.text(row + 2, col, `└${"─".repeat(inner)}┘`);
  }

  line(points, offset = 0) {
    const cells = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
      const [r1, c1] = points[index];
      let [r, c] = cells[cells.length - 1];
      while (r !== r1 || c !== c1) {
        r += Math.sign(r1 - r);
        c += Math.sign(c1 - c);
        cells.push([r, c]);
      }
    }

    const side = (from, to) =>
      to[0] < from[0] ? "up" : to[0] > from[0] ? "down" : to[1] < from[1] ? "left" : "right";

    cells.forEach((cell, index) => {
      const prev = cells[index - 1];
      const next = cells[index + 1];
      if (!next) {
        this.put(cell[0], cell[1], HEADS[side(prev, cell)]);
        return;
      }
      if (!prev || side(prev, cell) === side(cell, next)) {
        this.put(cell[0], cell[1], cell[1] === next[1] ? "│" : "─");
        return;
      }
      const ends = new Set([side(cell, prev), side(cell, next)]);
      this.put(
        cell[0],
        cell[1],
        ends.has("up") ? (ends.has("right") ? "└" : "┘") : ends.has("right") ? "┌" : "┐"
      );
    });

    return { cells: cells.slice(0, -1), offset };
  }
}

// Wide: one row of nodes, time feeding pace from below.
const WIDE = {
  name: "wide",
  rows: 10,
  cols: 78,
  draw(grid) {
    grid.text(0, 0, "WE PAY");
    grid.text(0, 60, "WE GET");
    grid.box(2, 0, "EXPERTISE", 13);
    grid.box(2, 23, "TRUST", 9);
    grid.box(2, 42, "PACE", 9);
    grid.box(2, 60, "CRAFT, QUICKLY", 18);
    grid.box(7, 0, "TIME", 13);
    grid.text(1, 15, "earns");
    grid.text(1, 34, "powers");
    grid.text(1, 52, "delivers");
    grid.text(9, 25, "we spend");
    return {
      paths: [
        grid.line([[3, 13], [3, 22]], 0),
        grid.line([[3, 32], [3, 41]], 2),
        grid.line([[3, 51], [3, 59]], 4),
        grid.line([[8, 13], [8, 46], [5, 46]], 1)
      ],
      meter: { row: 5, col: 60, width: 18 }
    };
  }
};

// Narrow: the chain stacks on one centre line; time comes in from the side.
const NARROW = {
  name: "narrow",
  rows: 23,
  cols: 34,
  draw(grid) {
    grid.text(0, 3, "WE PAY");
    grid.box(1, 3, "EXPERTISE", 13);
    grid.box(1, 21, "TIME", 13);
    grid.box(7, 5, "TRUST", 9);
    grid.box(13, 5, "PACE", 9);
    grid.box(19, 0, "CRAFT, QUICKLY", 19);
    grid.text(5, 11, "earns");
    grid.text(11, 11, "powers");
    grid.text(17, 11, "delivers");
    grid.text(8, 18, "we spend");
    grid.text(20, 21, "WE GET");
    return {
      paths: [
        grid.line([[4, 9], [6, 9]], 0),
        grid.line([[10, 9], [12, 9]], 2),
        grid.line([[16, 9], [18, 9]], 4),
        grid.line([[4, 27], [14, 27], [14, 14]], 1)
      ],
      meter: { row: 22, col: 0, width: 19 }
    };
  }
};

export const LAYOUTS = { wide: WIDE, narrow: NARROW };

export function createLedger(pre) {
  let layout;
  let base = [];
  let paths = [];
  let meter;

  const write = (cells) => {
    pre.textContent = cells.map((row) => row.join("").replace(/\s+$/, "")).join("\n");
  };

  const drawMeter = (cells, filled, fresh) => {
    if (!meter) return;
    for (let index = 0; index < meter.width; index += 1) {
      const char = index < filled ? (fresh && index === filled - 1 ? "▒" : "▓") : EMPTY;
      cells[meter.row][meter.col + index] = char;
    }
  };

  const api = {
    get layout() {
      return layout;
    },

    setLayout(next) {
      if (next === layout) return false;
      layout = next;
      const grid = new Grid(next.rows, next.cols);
      ({ paths, meter } = next.draw(grid));
      base = grid.cells;
      api.rest();
      return true;
    },

    // The resting picture: no packets, a full meter. What you get is the point.
    rest() {
      if (!layout) return;
      const cells = base.map((row) => [...row]);
      drawMeter(cells, meter?.width ?? 0, false);
      write(cells);
    },

    frame(tick) {
      if (!layout) return;
      const cells = base.map((row) => [...row]);
      const step = Math.floor(tick / STEP_TICKS);

      paths.forEach(({ cells: route, offset }) => {
        for (let head = (step + offset) % SPACING; head < route.length + TRAIL.length; head += SPACING) {
          TRAIL.forEach((char, back) => {
            const point = route[head - back];
            if (point) cells[point[0]][point[1]] = char;
          });
        }
      });

      // One cell per packet that reaches craft, then a hold on the full meter, then empty.
      const last = paths[paths.length - 2];
      const arrival = Math.max(0, step + last.offset - (last.cells.length - 1));
      const position = arrival % CYCLE_STEPS;
      const arrived = Math.min(METER_ARRIVALS, Math.floor(position / SPACING) + (arrival > 0 ? 1 : 0));
      const filled = Math.round((meter.width * arrived) / METER_ARRIVALS);
      drawMeter(cells, filled, arrived < METER_ARRIVALS && position % SPACING < 2);

      write(cells);
    }
  };

  return api;
}
