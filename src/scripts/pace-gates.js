// The price of pace, as a character diagram. One team, two ways of working:
// gated (low trust: work queues behind nine checkpoints, one piece at a time, and maybe ships)
// and trusted (one quick check stays open; work loops ship → learn → go again).
// Structure sits on the character grid and changes in steps; packets are redrawn every frame
// with a soft ▓▒░ edge so they move smoothly while every mark stays a character.

const TRAIL = ["▓", "▒", "░"];
const FADE = ["▓", "▒", "░", "·"];
const RAMP = " .:+*#%@";
const HEADS = { right: "▸", left: "◂", down: "▾", up: "▴" };
export const STEP_MS = 120;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mod = (v, n) => ((v % n) + n) % n;
const hash = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const esc = (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.ch = Array.from({ length: rows }, () => Array(cols).fill(" "));
    this.cl = Array.from({ length: rows }, () => Array(cols).fill(""));
    this.lum = new Map();
  }

  put(r, c, ch, cls = "") {
    if (this.ch[r]?.[c] === undefined) return;
    this.ch[r][c] = ch;
    this.cl[r][c] = cls;
  }

  text(r, c, s, cls = "") {
    [...s].forEach((ch, i) => this.put(r, c + i, ch, cls));
  }

  center(r, c, s, cls = "") {
    this.text(r, Math.round(c + 0.5 - s.length / 2), s, cls);
  }

  // Changed text resolves left to right through the scramble ramp.
  scramble(r, c, s, age, step, cls = "") {
    const frame = Math.floor(step);
    [...s].forEach((ch, i) => {
      const settled = age >= i * 0.25 + 2;
      const glyph = settled || ch === " " ? ch : RAMP[1 + Math.floor(hash(frame, i + r * 7) * (RAMP.length - 1))];
      this.put(r, c + i, glyph, cls);
    });
  }

  box(r, c, w, label, cls = "", dotted = false) {
    const inner = w - 2;
    const left = Math.floor((inner - label.length) / 2);
    const h = dotted ? "┄" : "─";
    const v = dotted ? "┆" : "│";
    this.text(r, c, `┌${h.repeat(inner)}┐`, cls);
    this.text(r + 1, c, `${v}${" ".repeat(inner)}${v}`, cls);
    this.text(r + 1, c + 1 + left, label, cls);
    this.text(r + 2, c, `└${h.repeat(inner)}┘`, cls);
  }

  flash(r, c, w, level, cls = "") {
    const lv = Math.ceil(level);
    if (lv <= 0) return;
    const ch = TRAIL[3 - Math.min(3, lv)];
    for (let x = c; x < c + w; x++) {
      this.put(r, x, ch, cls);
      this.put(r + 2, x, ch, cls);
    }
    this.put(r + 1, c, ch, cls);
    this.put(r + 1, c + w - 1, ch, cls);
  }

  meter(r, c, w, value, step, cls = "") {
    const full = value * w;
    const lead = Math.floor(full);
    for (let i = 0; i < w; i++) {
      const v = full - i;
      let ch = v >= 1 ? "▓" : v >= 0.66 ? "▒" : v >= 0.33 ? "░" : "·";
      if (i === lead && value > 0 && value < 1) ch = Math.floor(step * 2) % 2 ? "▒" : "░";
      this.put(r, c + i, ch, v > 0.33 || (i === lead && value > 0) ? cls : "mute");
    }
  }

  route(points) {
    const cells = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [r1, c1] = points[i];
      let [r, c] = cells[cells.length - 1];
      while (r !== r1 || c !== c1) {
        r += Math.sign(r1 - r);
        c += Math.sign(c1 - c);
        cells.push([r, c]);
      }
    }
    return cells;
  }

  line(points, cls = "") {
    const cells = this.route(points);
    const side = (a, b) => (b[0] < a[0] ? "up" : b[0] > a[0] ? "down" : b[1] < a[1] ? "left" : "right");
    cells.forEach((cell, i) => {
      const prev = cells[i - 1];
      const next = cells[i + 1];
      let ch;
      if (!next) ch = HEADS[side(prev, cell)];
      else if (!prev || side(prev, cell) === side(cell, next)) ch = cell[1] === next[1] ? "│" : "─";
      else {
        const ends = new Set([side(cell, prev), side(cell, next)]);
        ch = ends.has("up") ? (ends.has("right") ? "└" : "┘") : ends.has("right") ? "┌" : "┐";
      }
      this.put(cell[0], cell[1], ch, cls);
    });
    return cells.slice(0, -1);
  }

  // Light a cell (0–1); the strongest light wins and becomes · ░ ▒ ▓ on output.
  deposit(r, c, v, cls = "") {
    if (this.ch[r]?.[c] === undefined || v <= 0) return;
    const key = r * this.cols + c;
    const prev = this.lum.get(key);
    if (!prev || v > prev.v) this.lum.set(key, { v, cls });
  }

  // A packet: soft leading edge, full head, a tail that fades over a few cells.
  packet(route, f, cls = "", tail = 3.2) {
    for (let x = Math.floor(f - tail) - 1; x <= Math.ceil(f); x++) {
      const d = f - x;
      const v = d < 0 ? 1 + d : clamp(1 - d / tail);
      const cell = route[x];
      if (cell) this.deposit(cell[0], cell[1], v, cls);
    }
  }

  stream(route, shift, spacing, cls = "") {
    for (let head = mod(shift, spacing); head < route.length + 3; head += spacing) this.packet(route, head, cls);
    return mod(shift - (route.length - 1), spacing);
  }

  html() {
    this.lum.forEach(({ v, cls }, key) => {
      const ch = v >= 0.82 ? "▓" : v >= 0.58 ? "▒" : v >= 0.33 ? "░" : v >= 0.12 ? "·" : null;
      if (ch) this.put(Math.floor(key / this.cols), key % this.cols, ch, cls);
    });
    return this.ch
      .map((row, r) => {
        let out = "";
        let open = "";
        row.forEach((ch, c) => {
          const cls = this.cl[r][c];
          if (cls !== open) {
            if (open) out += "</span>";
            if (cls) out += `<span class="${cls}">`;
            open = cls;
          }
          out += esc(ch);
        });
        if (open) out += "</span>";
        return out.replace(/\s+$/, "");
      })
      .join("\n");
  }
}

const CHECKPOINTS = [
  "TRIO ALIGN", "REVIEW", "AUDIT", "WIDE REVIEW", "LEADERSHIP",
  "ITERATE", "TRIO REVIEW", "WHOLE TEAM", "LEADERSHIP"
];

// Wide: two lanes, one above the other.
const WIDE = {
  name: "wide",
  rows: 19,
  cols: 101,
  gated: {
    title: [0, 0], sub: [0, 21], trust: [1, 0, 7, 20], status: [1, 30],
    expertise: [1, 45, 56, 20], blocked: [1, 78],
    box: [4, 0, 11], route: [[5, 12], [5, 87]], ship: [4, 88, 13], cadence: [8, 85],
    gates: CHECKPOINTS.map((label, i) => ({ i: 10 + i * 7, label, at: [i % 2 ? 7 : 3, 22 + i * 7] }))
  },
  trusted: {
    title: [10, 0], sub: [10, 21], trust: [11, 0, 7, 20], status: [11, 30],
    expertise: [11, 45, 56, 20], flowing: [11, 78],
    box: [13, 0, 11], route: [[14, 12], [14, 87]], ship: [13, 88, 13], cadence: [12, 87], tally: [16, 58],
    check: { i: 38, at: [12, 50] },
    loop: [[16, 94], [17, 94], [17, 5], [16, 5]], loopLabel: [18, 50]
  }
};

// Narrow: the two lanes side by side, running down the page.
const NARROW = {
  name: "narrow",
  rows: 43,
  cols: 46,
  gated: {
    title: [0, 0], sub: null, trust: [1, 0, 6, 8], status: [2, 0],
    box: [4, 0, 11], route: [[7, 5], [36, 5]], ship: [37, 0, 11], cadence: [40, 0],
    gates: CHECKPOINTS.map((label, i) => ({ i: 4 + i * 3, label, at: [11 + i * 3, 8] }))
  },
  trusted: {
    title: [0, 23], sub: null, trust: [1, 23, 29, 8], status: [2, 23],
    box: [4, 23, 13], route: [[7, 29], [36, 29]], ship: [37, 23, 13], cadence: [40, 23], tally: [3, 23],
    check: { i: 14, at: [21, 32] },
    loop: [[38, 36], [38, 40], [5, 40], [5, 36]], loopLabel: [42, 29]
  }
};

export const LAYOUTS = { wide: WIDE, narrow: NARROW };

const changes = () => {
  const seen = new Map();
  return (key, value, step) => {
    const prev = seen.get(key);
    if (!prev || prev.value !== value) seen.set(key, { value, at: prev ? step : -99 });
    return step - seen.get(key).at;
  };
};

export function createPaceGates(pre) {
  const WAIT = 26;
  let layout = WIDE;
  let since = changes();
  let cycle = 0;
  let lastStep = -1;
  let queue = [];
  let lead = null;
  let shipped = 0;
  let shippedAt = -99;

  const reset = () => {
    queue = [];
    lead = null;
    shipped = 0;
    shippedAt = -99;
  };

  const plan = () => {
    const grid = new Grid(layout.rows, layout.cols);
    const length = grid.route(layout.gated.route).length - 1;
    return { length, gates: layout.gated.gates };
  };
  let shape = plan();

  const advance = (s) => {
    if (s === 0) reset();
    const { gates, length } = shape;
    if (s % 16 === 0) queue.push({ p: 0, prev: 0 });
    queue.sort((a, b) => b.p - a.p);
    queue.forEach((q, i) => {
      q.prev = q.p;
      const limit = i === 0 ? gates[0].i - 1 : queue[i - 1].p - 2;
      if (q.p < limit) q.p += 1;
    });
    if (!lead && queue.length && queue[0].p === gates[0].i - 1) {
      const q = queue.shift();
      lead = { p: q.p, prev: q.p, gate: 0, waitedFrom: s };
    }
    if (!lead) return;
    lead.prev = lead.p;
    const gate = gates[lead.gate];
    if (gate && lead.p === gate.i - 1) {
      if (s - lead.waitedFrom >= WAIT) {
        lead.p += 2;
        lead.gate += 1;
      }
      return;
    }
    lead.p += 1;
    const next = gates[lead.gate];
    if (next && lead.p === next.i - 1) lead.waitedFrom = s;
    if (lead.p > length - 1) {
      shipped += 1;
      shippedAt = s;
      lead = null;
    }
  };

  const gateCells = (cell, horizontal) =>
    horizontal
      ? [[cell[0] - 1, cell[1]], cell, [cell[0] + 1, cell[1]]]
      : [[cell[0], cell[1] - 1], cell, [cell[0], cell[1] + 1]];

  const draw = (step, frac) => {
    while (lastStep < step) {
      lastStep += 1;
      advance(lastStep % cycle);
    }
    const s = (step % cycle) + frac;
    const g = new Grid(layout.rows, layout.cols);
    const wide = layout === WIDE;
    const A = layout.gated;
    const B = layout.trusted;

    // Gated -----------------------------------------------------------------------------
    g.text(A.title[0], A.title[1], wide ? "SAME TEAM, GATED" : "GATED");
    if (A.sub) g.text(A.sub[0], A.sub[1], "nine checkpoints, thorough, slow", "mute");
    g.text(A.cadence[0], A.cadence[1], "every 3–4 months", "mute");
    g.text(A.trust[0], A.trust[1], "TRUST", "mute");
    g.meter(A.trust[0], A.trust[2], A.trust[3], 0.1 + (Math.floor(s / 3) % 2) * 0.02, s, "fail");
    const stuck = queue.length > 1;
    if (wide) {
      g.text(A.status[0], A.status[1], "low", "fail");
      g.text(A.expertise[0], A.expertise[1], "EXPERTISE", "mute");
      g.meter(A.expertise[0], A.expertise[2], A.expertise[3], 1, s);
      g.scramble(A.blocked[0], A.blocked[1], stuck ? "waiting" : "", since("blocked", stuck, step), step, "fail");
    } else {
      g.scramble(A.status[0], A.status[1], stuck ? "work waiting" : "", since("blocked", stuck, step), step, "fail");
    }

    g.box(A.box[0], A.box[1], A.box[2], "TEAM");
    const top = g.line(A.route, "mute");
    const horizontal = A.route[0][0] === A.route[1][0];
    A.gates.forEach((gate, i) => {
      const cell = top[gate.i];
      const leadHere = lead && lead.gate === i && lead.p === gate.i - 1;
      const waited = leadHere ? s - lead.waitedFrom : 0;
      const passing = lead && lead.gate === i + 1 && lead.p >= gate.i && lead.p - gate.i <= 2;
      const opening = leadHere && waited > WAIT - 4;
      const active = leadHere || passing;
      if (wide) g.center(gate.at[0], gate.at[1], gate.label, active ? "" : "mute");
      else g.text(gate.at[0], gate.at[1], gate.label, active ? "" : "mute");
      gateCells(cell, horizontal).forEach(([r, c], k) => {
        if (passing) g.put(r, c, k === 1 ? (horizontal ? "─" : "│") : horizontal ? "╎" : "╌", "mute");
        else if (opening) g.put(r, c, FADE[Math.min(3, Math.floor(waited - (WAIT - 4)))]);
        else g.put(r, c, leadHere && (k + Math.floor(s * 2)) % 3 === 0 ? "▒" : "▓", leadHere ? "" : "mute");
      });
    });
    queue.forEach((q) => g.packet(top, q.prev + (q.p - q.prev) * frac));
    if (lead) g.packet(top, lead.prev + (lead.p - lead.prev) * frac);
    const shipLabel = shipped ? `SHIPPED ${shipped}` : "SHIP?";
    g.box(A.ship[0], A.ship[1], A.ship[2], "", shipped ? "ok" : "mute", !shipped);
    g.scramble(A.ship[0] + 1, A.ship[1] + 1 + Math.floor((A.ship[2] - 2 - shipLabel.length) / 2), shipLabel, since("ship", shipped, step), step, shipped ? "ok" : "mute");
    g.flash(A.ship[0], A.ship[1], A.ship[2], 3 - (s - shippedAt), "ok");

    // Trusted ---------------------------------------------------------------------------
    g.text(B.title[0], B.title[1], wide ? "SAME TEAM, TRUSTED" : "TRUSTED");
    if (B.sub) g.text(B.sub[0], B.sub[1], "one quick check, ship, learn, fix", "mute");
    g.text(B.trust[0], B.trust[1], "TRUST", "mute");
    g.meter(B.trust[0], B.trust[2], B.trust[3], 0.92, s, "ok");
    if (wide) {
      g.text(B.status[0], B.status[1], "high", "ok");
      g.text(B.expertise[0], B.expertise[1], "EXPERTISE", "mute");
      g.meter(B.expertise[0], B.expertise[2], B.expertise[3], 1, s, "ok");
      g.text(B.flowing[0], B.flowing[1], "flowing", "ok");
    } else {
      g.text(B.status[0], B.status[1], "work flowing", "ok");
    }

    g.box(B.box[0], B.box[1], B.box[2], "TEAM", "ok");
    const lane = g.line(B.route, "mute");
    const checkCell = lane[B.check.i];
    gateCells(checkCell, horizontal).forEach(([r, c], k) => {
      if (k !== 1) g.put(r, c, horizontal ? "╎" : "╌", "ok");
    });
    if (wide) g.center(B.check.at[0], B.check.at[1], "QUICK CHECK", "ok");
    else g.text(B.check.at[0], B.check.at[1], "CHECK", "ok");
    const loop = g.line(B.loop, "mute");
    if (wide) g.center(B.loopLabel[0], B.loopLabel[1], "learn together, fix, go again", "mute");
    else g.center(B.loopLabel[0], B.loopLabel[1], "learn, fix, go again", "mute");

    // One piece of work at a time travels the lane, sits in "shipped" for a moment, then comes
    // back round the loop. Some ship broken: they go out red, come back red, and are fixed when
    // they reach the team again. Spacing is set so this lane ships about thirteen times for every
    // one release on the gated lane: weekly against every three to four months.
    const SPACING = 26;
    const DWELL = 4;
    const total = lane.length + DWELL + loop.length;
    const broken = (id) => id > 0 && hash(id, 7) < 0.22;
    // Some work slips: it gets held at the check for a few cells and runs out of line after.
    const slipped = (id) => id > 0 && !broken(id) && hash(id, 13) < 0.3;
    const HOLD = 5;
    const lagAt = (id, head) => (slipped(id) ? clamp((head - B.check.i) / 1.6, 0, HOLD) : 0);
    const shift = s * 1.15;
    let holding = false;
    for (let head = mod(shift, SPACING); head < total + 3 + HOLD; head += SPACING) {
      const id = Math.round((shift - head) / SPACING);
      const cls = broken(id) ? "fail" : "ok";
      const lag = lagAt(id, head);
      const at = head - lag;
      if (lag > 0 && lag < HOLD) holding = true;
      if (at < lane.length + 3) g.packet(lane, at, cls);
      const back = at - lane.length - DWELL;
      if (back > -1) g.packet(loop, back, cls);
    }
    if (holding) {
      const [cr, cc] = B.check.at;
      if (wide) g.center(cr + 4, cc, "slipped", "fail");
      else g.text(cr + 1, cc, "slip", "fail");
    }
    const passed = (distance) => Math.max(0, Math.floor((shift - distance) / SPACING) + 1);
    const count = passed(lane.length - 1);
    let broke = 0;
    let fixed = 0;
    let slips = 0;
    for (let id = 0; id < count; id++) {
      if (broken(id)) broke++;
      if (slipped(id)) slips++;
    }
    for (let id = 0; id < passed(total - 1); id++) if (broken(id)) fixed++;
    const ago = mod(shift - (lane.length - 1), SPACING);
    const arriving = Math.floor((shift - (lane.length - 1)) / SPACING);
    g.box(B.ship[0], B.ship[1], B.ship[2], "", "ok");
    const label = `SHIPPED ${count}`;
    g.text(B.ship[0] + 1, B.ship[1] + 1 + Math.floor((B.ship[2] - 2 - label.length) / 2), label, "ok");
    g.flash(B.ship[0], B.ship[1], B.ship[2], 3 - ago, arriving >= 0 && broken(arriving) ? "fail" : "ok");
    g.text(B.cadence[0], B.cadence[1], "weekly → daily", "ok");
    const tally = wide ? `${slips} slipped · ${broke} broke · ${fixed} fixed` : `${slips} slip ${broke} broke ${fixed} fixed`;
    g.scramble(B.tally[0], B.tally[1], tally, since("tally", tally, step), step, broke > fixed ? "fail" : "mute");

    return g.html();
  };

  const api = {
    get layout() {
      return layout;
    },
    setLayout(next) {
      if (next === layout && lastStep >= 0) return false;
      layout = next;
      shape = plan();
      cycle = shape.length + shape.gates.length * WAIT + 40;
      since = changes();
      lastStep = -1;
      reset();
      return true;
    },
    html(stepFloat) {
      const step = Math.floor(stepFloat);
      return draw(step, stepFloat - step);
    },
    render(stepFloat) {
      pre.innerHTML = api.html(stepFloat);
    },
    // A still for reduced motion: work queued at a gate, the trusted lane mid-flow.
    still() {
      lastStep = -1;
      reset();
      api.render(150);
    }
  };
  api.setLayout(WIDE);
  return api;
}
