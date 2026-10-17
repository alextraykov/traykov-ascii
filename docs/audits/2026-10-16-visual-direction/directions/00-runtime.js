/* CONTRACT · the Dir runtime (window.Dir). Batches 1–6 build against this; do not change it without telling them.

   PARTIAL FILE. One file per batch, e.g. 20-actions-selection.html, holding one or more groups:
     <section class="group" id="g-actions"><h2>Actions</h2> …articles… </section>
   Keep ≤ 48 KB. No <img>, no url(…), no http, no ids or <script> inside <template>, plain words only.

   ARTICLE (one per component):
     <article class="cmp" id="cmp-primary" data-name="Primary button" data-group="Actions" data-num="8"
              data-baseline="One line on what the site does today."  [data-wide] [data-phone-only] [data-no-pick]>
       <template data-markup> …markup, cloned into all three columns… </template>
       <template data-markup="c"> …optional override for one column (a, b or c)… </template>
       <style> #cmp-primary .dir-a .x {…}  #cmp-primary .dir-b … @container col (max-width: 640px) {…} </style>
       <script> Dir.component("cmp-primary", (col, dir, api) => { … }); </script>
     </article>
   The runtime adds the header (name, baseline, Replay), three columns and the pick control.
   Column = <div class="col dir-a" data-dir="a"> > .col-head + .col-body (the clone). Each .col is a size
   container named "col"; phone view makes it 375 px. Style only with tokens; per-direction tokens
   (--cell-size, --marker-width, --snap, --press-in, --type-h1, --read-size, --unit …) are set on .dir-a/b/c.
   Ids inside a template are suffixed per column (id="x" becomes "x-a"); for, aria-*, list and href="#x"
   that point at them are rewritten too. Radio names become "<article id>-<name>-<dir>".

   BINDER. Dir.component(id, fn) — fn(col, dir, api) runs once per column after cloning, and again after
   Replay on a fresh clone. Return a function to clean up. Call only Dir.component at the top level.
   api (bound to this column's direction):
     api.dir, api.col, api.body, api.replaying       "a" | "b" | "c"; the column; its body; true on Replay
     api.ms("--press-in")                             a token in ms, read on this column
     api.press(el, {role: "primary"|"secondary"})     the press: fill on click with this direction's timing
                                                      (A reading order 2·4·6·8; B diagonal; C Bayer with the
                                                      level-6 beat, 5 in dark; C secondary stops at the beat)
     api.marker(el, "left"|"right"|"under")           → {arrive(), leave(), hold(bool), el}
     api.fill(el, {size}) → {to(level, {order, total, stepMs, levels, holdAt, holdMs, done})}
     api.tick(el, cb(count), rest?)                   shared 40 ms clock; rest() draws the still frame
     api.loader(host, "quarter"|"sweep"|"breathe", {cell, n, every, band}) → stop()
     api.simulate(button, {working, done, ms, hold}) the working → done ladder inside a pressed button
     api.enter(scope?)   api.leave(el, {hide})   api.open(el)   api.close(el)   api.flash(el)
     api.icon(host, name, {cell})  api.morph(host, name)  api.cells(host, n, {clear, level})  api.setLevel(cell, n)
     api.placeholder(host, cols = 16, rows = 10, glyph = "block")   api.timeout(fn, ms)   api.cleanup(fn)
   Declarative hooks inside a template (bound after the binder runs, idempotent):
     data-press="primary|secondary"   the press           data-marker="left|right|under"  hover/focus marker
     data-label-step                  label steps aside while its marker host is hot (.is-hot)
     data-enter / data-enter="media"  entrance when first seen and on Replay (snap / sweep / dissolve)

   GLOBALS. Dir.cells, setLevel, icon, morph, ICONS (check play pause close chevron chevronUp upload
   themeLight themeDark menu block), runField, curves {out, linear}, order(kind, x, y, cols, rows, origin)
   kind = reading | diagonal | point | bayer, fill, press, marker, onTick, loader, simulate, enter, leave,
   open, close, flash, placeholder(host, cols, rows, glyph), readMs(token, el), motionActive(),
   onMotion(cb(active)), replay(id?), pick(id) → {pick: "a"|"b"|"c"|"undecided", note} | null.

   MOTION. html[data-motion="off"] or prefers-reduced-motion: CSS stops every animation and transition
   inside .cmp, Dir.motionActive() is false, runField jumps to its last frame, the tick stops and calls
   each rest(). Every block must be complete at rest.
   CLASSES. .cell[data-level=0–8] .cells .cell-icon(.cell-icon--ok) .rule-soft(.is-on) .is-dotted .reason
   .has-fill/.fill-label .is-entering .is-leaving .is-switching-on/off .tex[data-level] .ph .demo-row
   .demo-link .demo-label .vh. Disabled = aria-disabled="true" + .is-dotted + aria-describedby reason. */
(() => {
  "use strict";
  const Dir = window.Dir || (window.Dir = {});
  const queue = Dir._q || [];
  const binders = new Map();
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const PREFS = "traykov-directions-review";
  const PICKS = "traykov-direction-picks-v1";
  const DIRS = [["a", "Ruled paper"], ["b", "Cell grid"], ["c", "Printed dither"]];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
  const store = (key, value) => { try { if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null"); localStorage.setItem(key, JSON.stringify(value)); } catch (error) { return null; } return null; };
  const dirOf = (el) => (el.closest && el.closest(".col") ? el.closest(".col").dataset.dir : "b");
  const colOf = (el) => (el.closest && el.closest(".col")) || root;

  /* motion */
  const motionActive = () => root.dataset.motion !== "off" && !reduced.matches;
  const motionCbs = new Set();
  const onMotion = (cb) => { motionCbs.add(cb); return () => motionCbs.delete(cb); };
  const fireMotion = () => { const active = motionActive(); motionCbs.forEach((cb) => cb(active)); };
  reduced.addEventListener("change", fireMotion);

  /* cells (port of cells.js) */
  const curves = { out: (x) => 1 - Math.pow(1 - x, 3), linear: (x) => x };
  const readMs = (token, el = root) => {
    const value = getComputedStyle(el).getPropertyValue(token).trim();
    const number = parseFloat(value);
    if (!Number.isFinite(number)) return 0;
    return /[^m]s$/.test(value) ? number * 1000 : number;
  };
  const setLevel = (cell, level) => { const next = String(Math.max(0, Math.min(8, Math.round(level)))); if (cell.dataset.level !== next) cell.dataset.level = next; };
  const cells = (host, count, { clear = false, level = 0 } = {}) => {
    const list = [];
    for (let index = 0; index < count; index += 1) {
      const cell = make("i", clear ? "cell cell--clear" : "cell");
      cell.dataset.level = String(level);
      cell.setAttribute("aria-hidden", "true");
      host.append(cell);
      list.push(cell);
    }
    return list;
  };
  const runField = ({ values, total = 600, curve = curves.out, steps, stepMs = 30, render, done }) => {
    if (!motionActive()) { render(() => steps); if (done) done(); return () => {}; }
    const delays = values.map((value) => total * curve(Math.min(1, Math.max(0, value))));
    const end = Math.max(0, ...delays) + steps * stepMs;
    const start = performance.now();
    let frame = 0;
    const loop = (now) => {
      const elapsed = now - start;
      render((index) => Math.min(steps, Math.floor((elapsed - delays[index]) / stepMs)));
      if (elapsed < end) frame = requestAnimationFrame(loop);
      else if (done) done();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  };
  const order = (kind, x, y, cols, rows, origin) => {
    if (kind === "point" && origin) return Math.hypot(x - origin.x * cols, y - origin.y * rows) / Math.hypot(cols, rows);
    if (kind === "reading") return x / Math.max(1, cols - 1);
    if (kind === "bayer") return BAYER[(y % 4) * 4 + (x % 4)] / 15;
    return (x + y) / Math.max(1, cols + rows - 2);
  };

  /* icons */
  const LEVEL_OF = { "#": 8, "+": 5, ":": 3, ".": 0 };
  const ICONS = {
    check: ["....#", "...##", "#.##.", "###..", ".#..."],
    play: ["#....", "###..", "#####", "###..", "#...."],
    pause: ["##.##", "##.##", "##.##", "##.##", "##.##"],
    menu: ["#####", ".....", "#####", ".....", "#####"],
    close: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    chevron: ["#...#", ".#.#.", "..#.."],
    chevronUp: ["..#..", ".#.#.", "#...#"],
    upload: ["..#..", ".###.", "#.#.#", "..#..", "#####"],
    themeLight: ["#####", "#..##", "#..##", "#..##", "#####"],
    themeDark: ["#####", "##..#", "##..#", "##..#", "#####"],
    block: ["#####", "#####", "#####", "#####", "#####"]
  };
  const icon = (host, name, { cell = 3 } = {}) => {
    const pattern = ICONS[name];
    host.classList.add("cell-icon");
    host.style.setProperty("--cells", pattern[0].length);
    host.style.setProperty("--icon-cell", `${cell}px`);
    host.setAttribute("aria-hidden", "true");
    host.textContent = "";
    host._cells = cells(host, pattern.length * pattern[0].length, { clear: true });
    host._width = pattern[0].length;
    pattern.join("").split("").forEach((symbol, index) => setLevel(host._cells[index], LEVEL_OF[symbol]));
    return host;
  };
  const morph = (host, name) => {
    const target = ICONS[name].join("").split("").map((symbol) => LEVEL_OF[symbol]);
    const list = host._cells || [];
    const from = list.map((cell) => Number(cell.dataset.level));
    const width = host._width || 5;
    return runField({
      values: list.map((_, index) => ((index % width) + Math.floor(index / width)) / (width * 2)),
      total: 120, steps: 3,
      render: (at) => list.forEach((cell, index) => setLevel(cell, from[index] + ((target[index] || 0) - from[index]) * Math.min(1, Math.max(0, at(index) + 1) / 3)))
    });
  };

  /* the shared clock (port of tick.js): one interval, visible subscribers only, stops with motion */
  const subs = new Set();
  let timer = 0;
  let count = 0;
  const sync = () => {
    const run = motionActive() && [...subs].some((sub) => sub.visible);
    if (run && !timer) timer = setInterval(step, readMs("--tick") || 40);
    if (!run && timer) { clearInterval(timer); timer = 0; }
  };
  const unsub = (sub) => { subs.delete(sub); if (![...subs].some((other) => other.el === sub.el)) io.unobserve(sub.el); sync(); };
  function step() { count += 1; subs.forEach((sub) => { if (!sub.el.isConnected) unsub(sub); else if (sub.visible) sub.cb(count); }); }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => subs.forEach((sub) => { if (sub.el === entry.target) sub.visible = entry.isIntersecting; }));
    sync();
  });
  const onTick = (el, cb, rest) => {
    const sub = { el, cb, rest, visible: false };
    subs.add(sub);
    io.observe(el);
    if (rest && !motionActive()) rest();
    return () => unsub(sub);
  };
  onMotion((active) => { if (!active) subs.forEach((sub) => sub.rest && sub.rest()); sync(); });

  /* the fill behind a control (port of fillLayer, plus level paths and a hold beat) */
  const fill = (el, { size = 12 } = {}) => {
    if (el._fill) return el._fill;
    el.classList.add("has-fill");
    const layer = make("span", "fill-layer");
    layer.setAttribute("aria-hidden", "true");
    el.prepend(layer);
    let list = []; let levels = []; let cols = 0; let rows = 0; let stop = () => {}; let token = 0; let hold = 0;
    const build = () => {
      const rect = el.getBoundingClientRect();
      cols = Math.max(1, Math.ceil(rect.width / size));
      rows = Math.max(1, Math.ceil(rect.height / size));
      layer.style.setProperty("--fill-cell", `${size}px`);
      layer.style.setProperty("--fill-cols", cols);
      layer.textContent = "";
      list = cells(layer, cols * rows, { clear: true });
      levels = list.map(() => 0);
    };
    const paint = (index, value) => { if (levels[index] !== value) { levels[index] = value; setLevel(list[index], value); } };
    const mark = () => {
      const mean = levels.reduce((sum, value) => sum + value, 0) / (levels.length || 1);
      el.classList.toggle("is-inverted", mean > 0 && mean >= (el._invertAt || 6));
    };
    const to = (level, options = {}) => {
      const { order: kind = "diagonal", origin = null, total = 240, stepMs = 16, levels: path, holdAt, holdMs = 120, done } = options;
      clearTimeout(hold);
      if (holdAt != null && level > holdAt) {
        return to(holdAt, { ...options, holdAt: null, done: () => { hold = setTimeout(() => to(level, { order: kind, levels: [level], stepMs, total: 0, done }), motionActive() ? holdMs : 0); } });
      }
      const rect = el.getBoundingClientRect();
      if (!list.length || Math.ceil(rect.width / size) !== cols || Math.ceil(rect.height / size) !== rows) build();
      stop();
      const current = (token += 1);
      el.classList.remove("is-filled");
      el.classList.add("is-filling");
      const from = levels.slice();
      const steps = path ? path.length : 8;
      stop = runField({
        values: list.map((_, index) => order(kind, index % cols, Math.floor(index / cols), cols, rows, origin)),
        total, steps, stepMs,
        render: (at) => {
          if (current !== token) return;
          list.forEach((_, index) => {
            const k = at(index);
            if (k < 0) return;
            paint(index, path ? path[Math.min(k, steps - 1)] : Math.round(from[index] + (level - from[index]) * Math.min(1, (k + 1) / 8)));
          });
          mark();
        },
        done: () => {
          if (current !== token) return;
          list.forEach((_, index) => paint(index, level));
          el.classList.toggle("is-filled", level === 8);
          if (level === 0) el.classList.remove("is-filling");
          mark();
          if (done) done();
        }
      });
      return undefined;
    };
    el._fill = { to, el, get level() { return levels.reduce((sum, value) => sum + value, 0) / (levels.length || 1); } };
    return el._fill;
  };

  /* the press per direction (plan §1 token table) */
  const pressPlan = (dir, role, ms, beat) => {
    if (dir === "a") return { max: 8, invertAt: 6, in: { order: "reading", levels: [2, 4, 6, 8], stepMs: 20, total: Math.max(0, ms.in - 80) }, out: { order: "reading", levels: [6, 4, 2, 0], stepMs: 40, total: 0 } };
    if (dir === "c") {
      const secondary = role === "secondary";
      return { max: secondary ? beat : 8, invertAt: beat, in: { order: "bayer", levels: [2, 4, beat], stepMs: 34, total: 48, holdAt: secondary ? null : beat, holdMs: 120 }, out: { order: "bayer", levels: secondary ? [4, 2, 0] : [6, 4, 2, 0], stepMs: 60, total: 0 } };
    }
    return { max: 8, invertAt: 0.01, in: { order: "diagonal", total: ms.in }, out: { order: "diagonal", total: ms.out } };
  };
  const press = (el, { role = "primary", dir = dirOf(el) } = {}) => {
    if (el._press) return el._press;
    const label = make("span", "fill-label");
    [...el.childNodes].forEach((node) => { if (!(node.classList && (node.classList.contains("marker") || node.classList.contains("fill-layer")))) label.append(node); });
    el.append(label);
    const surface = fill(el, { size: 12 });
    const col = colOf(el);
    let wait = 0;
    const run = () => {
      if (el.disabled || el.getAttribute("aria-disabled") === "true" || el.dataset.state || !motionActive()) return;
      clearTimeout(wait);
      const ms = { in: readMs("--press-in", col), hold: readMs("--press-hold", col), out: readMs("--press-out", col) };
      const plan = pressPlan(dir, role, ms, readMs("--press-beat", col) || 8);
      el._invertAt = plan.invertAt;
      surface.to(plan.max, { ...plan.in, done: () => { wait = setTimeout(() => surface.to(0, plan.out), ms.hold); } });
    };
    el.addEventListener("click", run);
    el._press = { run, fill: surface, label };
    return el._press;
  };

  /* markers: A scales in 3 steps, B is a column (or row) of cells, C steps through levels 3 → 6 → 8 */
  const marker = (host, dir = dirOf(host), edge = "left") => {
    if (host._marker) return host._marker;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const el = make("span", `marker marker--${edge}`);
    el.setAttribute("aria-hidden", "true");
    if (dir === "c") el.dataset.level = "0";
    if (edge === "right") host.style.setProperty("--label-sign", "-1");
    host.append(el);
    const col = colOf(host);
    let on = false; let held = false; let stop = () => {};
    // Motion craft: hover markers are high-frequency. Arrival is at most 120 ms; leaving, keyboard
    // focus and motion-off are instant (the final state on the next frame).
    const set = (want, instant = false) => {
      if (want === on) return;
      on = want;
      host.classList.toggle("is-hot", want);
      stop();
      const stepMs = Math.min(40, readMs("--marker-step", col) || 40);
      const now = instant || !want || !motionActive();
      el.classList.toggle("is-instant", now);
      if (dir === "a") { el.classList.toggle("is-on", want); return; }
      if (now) {
        if (dir === "c") { el.dataset.level = want ? "8" : "0"; return; }
        if (want) { el.textContent = ""; cells(el, Math.max(1, edge === "under" ? Math.ceil(host.clientWidth / 5) : Math.ceil(host.clientHeight / 8)), { clear: true }); }
        [...el.children].forEach((cell) => setLevel(cell, want ? 8 : 0));
        return;
      }
      if (dir === "c") {
        const path = want ? [3, 6, 8] : [6, 3, 0];
        stop = runField({ values: [0], total: 0, steps: 3, stepMs, render: (at) => { const k = at(0); if (k >= 0) el.dataset.level = String(path[Math.min(k, 2)]); } });
        return;
      }
      const under = edge === "under";
      if (want) {
        el.textContent = "";
        cells(el, Math.max(1, under ? Math.ceil(host.clientWidth / 5) : Math.ceil(host.clientHeight / 8)), { clear: true });
      }
      const list = [...el.children];
      const n = list.length;
      if (!want && !under) { list.forEach((cell) => setLevel(cell, 0)); return; }
      const path = want ? (under ? [8] : [3, 8]) : [0];
      stop = runField({
        values: list.map((_, index) => { const v = under ? Math.floor((index * 7) / n) / 6 : index / Math.max(1, n - 1); return want ? v : 1 - v; }),
        total: under ? 100 : 40, curve: under ? curves.linear : curves.out, steps: path.length, stepMs: under ? 20 : stepMs,
        render: (at) => list.forEach((cell, index) => { const k = at(index); if (k >= 0) setLevel(cell, path[Math.min(k, path.length - 1)]); })
      });
    };
    host._marker = { el, arrive: (instant) => set(true, instant), leave: () => { if (!held) set(false); }, hold: (value) => { held = !!value; set(held, true); } };
    return host._marker;
  };
  const bindMarker = (host, dir) => {
    if (host._markerBound) return;
    host._markerBound = true;
    const ctl = marker(host, dir, host.dataset.marker || "left");
    const off = () => host.getAttribute("aria-disabled") === "true";
    host.addEventListener("pointerenter", () => { if (!off()) ctl.arrive(); });
    host.addEventListener("pointerleave", () => ctl.leave());
    host.addEventListener("focusin", () => { const active = document.activeElement; if (!off() && active && active.matches(":focus-visible")) ctl.arrive(true); });
    host.addEventListener("focusout", () => ctl.leave());
  };

  /* loaders on the clock: quarter turn, dither sweep, breathing cells */
  const loader = (host, kind = "quarter", options = {}) => {
    const dir = dirOf(host);
    host.textContent = "";
    host.classList.add("cells");
    host.setAttribute("aria-hidden", "true");
    let frame; let rest;
    if (kind === "quarter") {
      const size = options.cell || { a: 5, b: 7, c: 6 }[dir];
      const every = options.every || (dir === "b" ? 2 : 3);
      host.style.cssText += `--cells:2;--cell-size:${size}px;--cell-gap:1px`;
      const list = cells(host, 4);
      const seq = [0, 1, 3, 2];
      frame = (tick) => { const head = Math.floor(tick / every) % 4; seq.forEach((cellIndex, place) => setLevel(list[cellIndex], place === head ? 8 : place === (head + 3) % 4 ? 3 : 0)); };
      rest = () => frame(0);
    } else if (kind === "breathe") {
      const size = options.cell || { a: 5, b: 7, c: 12 }[dir];
      host.style.cssText += `--cells:3;--cell-size:${size}px;--cell-gap:1px`;
      const list = cells(host, 9);
      const wave = [1, 3, 5, 3, 1];
      frame = (tick) => list.forEach((cell, index) => setLevel(cell, wave[(((Math.floor(tick / 2) - (index % 3) - Math.floor(index / 3)) % 5) + 5) % 5]));
      rest = () => list.forEach((cell) => setLevel(cell, 3));
    } else {
      const n = options.n || 12;
      const band = options.band || [3, 6, 3];
      const size = options.cell || { a: 5, b: 7, c: 12 }[dir];
      host.style.cssText += `--cells:${n};--cell-size:${size}px;--cell-gap:1px`;
      const list = cells(host, n);
      frame = (tick) => { const head = (tick % (n + band.length)) - band.length; list.forEach((cell, index) => { const k = index - head; setLevel(cell, k >= 0 && k < band.length ? band[k] : 0); }); };
      rest = () => list.forEach((cell, index) => setLevel(cell, options.rest != null ? (index < band.length ? options.rest : 0) : 3));
    }
    rest();
    return onTick(host, frame, rest);
  };

  /* the working → done ladder inside a pressed button */
  const simulate = (button, { working = "Sending", done = "Sent", ms = 1200, hold = 1500, dir = dirOf(button), then } = {}) => {
    const ctl = button._press || press(button, { dir });
    if (button.dataset.state) return;
    const saved = [...ctl.label.childNodes];
    const word = (text) => make("span", "", text);
    button.dataset.state = "working";
    button.setAttribute("aria-busy", "true");
    const spinner = make("span", dir === "b" ? "press-bar" : "");
    let stop;
    ctl.label.replaceChildren();
    if (dir === "b") {
      button.append(spinner);
      stop = loader(spinner, "sweep", { n: Math.max(6, Math.floor(button.clientWidth / 8)), band: [8, 8, 8, 8], rest: 8 });
    } else {
      stop = loader(spinner, "quarter");
      ctl.label.append(spinner);
      if (dir === "c") { button._invertAt = 5; ctl.fill.to(5, { order: "bayer", levels: [2, 4, 5], stepMs: 50, total: 0 }); }
    }
    ctl.label.append(word(working));
    setTimeout(() => {
      stop();
      spinner.remove();
      button._invertAt = dir === "c" ? 6 : button._invertAt;
      if (ctl.fill.level > 0) ctl.fill.to(0, { order: "bayer", levels: dir === "c" ? [4, 2, 0] : [0], stepMs: 60, total: 0 });
      const check = make("span", "cell-icon--ok");
      icon(check, "check");
      ctl.label.replaceChildren(check, word(done));
      button.dataset.state = "done";
      button.removeAttribute("aria-busy");
      if (button._marker) button._marker.hold(true);
      setTimeout(() => {
        ctl.label.replaceChildren(...saved);
        delete button.dataset.state;
        if (button._marker) button._marker.hold(false);
        if (then) then();
      }, hold);
    }, ms);
  };

  /* entrances, exits, panels, error flash */
  const play = (el, cls) => new Promise((resolve) => {
    if (!motionActive()) { resolve(); return; }
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    let guard = 0;
    const end = (event) => {
      if (event && event.target !== el) return;
      clearTimeout(guard);
      el.removeEventListener("animationend", end);
      el.classList.remove(cls);
      resolve();
    };
    el.addEventListener("animationend", end);
    guard = setTimeout(end, 2000);
  });
  const enter = (scope, dir) => {
    const col = colOf(scope);
    dir = dir || col.dataset.dir || "b";
    if (col.dataset) delete col.dataset.enter;
    if (!motionActive()) return;
    const list = $$("[data-enter]", scope);
    const total = readMs("--stagger-total", col);
    list.forEach((el, index) => {
      const value = dir === "c" ? BAYER[index % 16] / 15 : index / Math.max(1, list.length - 1);
      el.style.setProperty("--enter-delay", `${Math.round(total * curves.out(value))}ms`);
      play(el, "is-entering");
    });
  };
  const leave = (el, { hide = true } = {}) => play(el, "is-leaving").then(() => { if (hide) el.hidden = true; });
  const open = (el) => { el.hidden = false; return play(el, "is-switching-on"); };
  const close = (el) => play(el, "is-switching-off").then(() => { el.hidden = true; });
  const flash = (el) => new Promise((resolve) => {
    el.classList.remove("is-error");
    if (!motionActive()) { el.classList.add("is-error"); resolve(); return; }
    [0, 120, 240, 360].forEach((at, index) => setTimeout(() => el.classList.toggle("is-flash", index % 2 === 0), at));
    setTimeout(() => { el.classList.remove("is-flash"); el.classList.add("is-error"); resolve(); }, 480);
  });
  const placeholder = (host, cols = 16, rows = 10, glyph = "block") => {
    host.classList.add("ph");
    host.style.aspectRatio = `${cols} / ${rows}`;
    host.textContent = "";
    const texture = make("span", "tex");
    texture.dataset.level = "1";
    const box = make("span", "ph-glyph");
    box.append(icon(make("span"), glyph, { cell: 4 }));
    host.append(texture, box);
    return host;
  };

  /* picks */
  let picks = store(PICKS) || {};
  const pick = (id) => picks[id] || null;
  const savePicks = () => store(PICKS, picks);
  const pickable = () => $$("article.cmp:not([data-no-pick])");
  const updateCount = () => {
    const list = pickable();
    const done = list.filter((art) => ["a", "b", "c"].includes((picks[art.id] || {}).pick)).length;
    $$("[data-pick-count]").forEach((el) => { el.textContent = `${done} of ${list.length} picked`; });
  };
  const exportText = () => {
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const lines = ["Component directions · your picks", `Exported ${date}`, $("[data-pick-count]") ? $("[data-pick-count]").textContent : "", ""];
    const groups = new Map();
    const waiting = [];
    pickable().forEach((art) => {
      const group = art.dataset.group || "Other";
      const entry = picks[art.id] || {};
      const note = entry.note ? ` — ${entry.note}` : "";
      const name = `${group} · ${art.dataset.name || art.id}`;
      if (!groups.has(group)) groups.set(group, []);
      if (["a", "b", "c"].includes(entry.pick)) groups.get(group).push(`${name}: ${entry.pick.toUpperCase()}${note}`);
      else waiting.push(`${name}${note}`);
    });
    groups.forEach((rows, group) => { if (rows.length) lines.push(group, ...rows, ""); });
    if (waiting.length) lines.push("Still undecided", ...waiting);
    return lines.join("\n").trim();
  };
  const buildPick = (art) => {
    const set = make("fieldset", "pick");
    set.append(make("legend", "", "Your pick"));
    const current = picks[art.id] || {};
    [...DIRS.map(([d, label]) => [d, `${d.toUpperCase()} · ${label}`]), ["undecided", "Undecided"]].forEach(([value, text]) => {
      const label = make("label");
      const input = make("input");
      input.type = "radio";
      input.name = `pick-${art.id}`;
      input.value = value;
      input.checked = current.pick === value;
      label.append(input, document.createTextNode(text));
      set.append(label);
    });
    const note = make("input");
    note.type = "text";
    note.placeholder = "A note, if you want one";
    note.setAttribute("aria-label", `Note on ${art.dataset.name || art.id}`);
    note.value = current.note || "";
    set.append(note);
    const save = () => {
      const chosen = $("input[type=radio]:checked", set);
      const entry = { pick: chosen ? chosen.value : undefined, note: note.value.trim() || undefined };
      if (entry.pick || entry.note) picks[art.id] = JSON.parse(JSON.stringify(entry)); else delete picks[art.id];
      savePicks();
      updateCount();
    };
    set.addEventListener("change", save);
    note.addEventListener("input", save);
    return set;
  };

  /* component blocks */
  const uniq = (frag, dir, artId) => {
    const ids = new Map();
    $$("[id]", frag).forEach((el) => { const next = `${el.id}-${dir}`; ids.set(el.id, next); el.id = next; });
    const attrs = ["for", "aria-controls", "aria-describedby", "aria-labelledby", "aria-owns", "aria-activedescendant", "list"];
    if (ids.size) $$("[for],[aria-controls],[aria-describedby],[aria-labelledby],[aria-owns],[aria-activedescendant],[list],[href^='#']", frag).forEach((el) => {
      attrs.forEach((name) => { if (el.hasAttribute(name)) el.setAttribute(name, el.getAttribute(name).split(/\s+/).map((t) => ids.get(t) || t).join(" ")); });
      const href = el.getAttribute("href");
      if (href && href[0] === "#" && ids.has(href.slice(1))) el.setAttribute("href", `#${ids.get(href.slice(1))}`);
    });
    $$("input[type=radio][name]", frag).forEach((el) => { el.name = `${artId}-${el.name}-${dir}`; });
  };
  const makeApi = (col, dir, body, replaying) => {
    const track = (fn) => { col._cleanups.push(fn); return fn; };
    return {
      dir, col, body, replaying,
      ms: (token) => readMs(token, col),
      press: (el, options = {}) => press(el, { ...options, dir }),
      marker: (el, edge) => marker(el, dir, edge),
      fill, cells, setLevel, icon, morph, placeholder, open, close, leave, flash,
      tick: (el, cb, rest) => track(onTick(el, cb, rest)),
      loader: (host, kind, options) => track(loader(host, kind, options)),
      simulate: (button, options = {}) => simulate(button, { ...options, dir }),
      enter: (scope = body) => enter(scope, dir),
      timeout: (fn, ms) => { const id = setTimeout(fn, ms); track(() => clearTimeout(id)); return id; },
      cleanup: track
    };
  };
  const buildCol = (art, col, replaying) => {
    const dir = col.dataset.dir;
    (col._cleanups || []).forEach((fn) => { try { fn(); } catch (error) { /* already gone */ } });
    col._cleanups = [];
    const body = $(".col-body", col);
    body.replaceChildren();
    const tpl = $(`:scope > template[data-markup="${dir}"]`, art) || $(":scope > template[data-markup='']", art);
    if (tpl) { const frag = tpl.content.cloneNode(true); uniq(frag, dir, art.id); body.append(frag); }
    const api = makeApi(col, dir, body, replaying);
    const fn = binders.get(art.id);
    if (fn) {
      try { const cleanup = fn(col, dir, api); if (typeof cleanup === "function") col._cleanups.push(cleanup); }
      catch (error) { console.error(`Dir: the binder for ${art.id} (${dir}) failed`, error); }
    }
    $$("[data-press]", body).forEach((el) => press(el, { role: el.dataset.press || "primary", dir }));
    $$("[data-marker]", body).forEach((el) => bindMarker(el, dir));
    if ($("[data-enter]", body) && motionActive()) {
      if (replaying) enter(body, dir); else col.dataset.enter = "pending";
    }
  };
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    $$(".col[data-enter='pending']", entry.target).forEach((col) => enter($(".col-body", col), col.dataset.dir));
  }), { threshold: 0.12 });
  const buildCmp = (art) => {
    if (art._built) return;
    art._built = true;
    const name = art.dataset.name || art.id;
    const head = make("header", "cmp-head");
    const title = make("h3", "cmp-name");
    if (art.dataset.num) title.append(make("small", "", art.dataset.num));
    title.append(name);
    const base = make("p", "cmp-base");
    if (art.dataset.baseline) base.append(make("b", "", "On the site today:"), " ", art.dataset.baseline);
    const replayButton = make("button", "btn btn--box", "Replay");
    replayButton.type = "button";
    replayButton.setAttribute("aria-label", `Replay ${name}`);
    replayButton.addEventListener("click", () => replay(art.id));
    head.append(title, base, replayButton);
    const tri = make("div", "tri");
    DIRS.forEach(([dir, label]) => {
      const col = make("div", `col dir-${dir}`);
      col.dataset.dir = dir;
      const colHead = make("p", "col-head");
      colHead.append(make("b", "", dir.toUpperCase()), ` · ${label}`);
      col.append(colHead, make("div", "col-body"));
      tri.append(col);
    });
    art.prepend(head, tri);
    if (!art.hasAttribute("data-no-pick")) art.append(buildPick(art));
    $$(".col", tri).forEach((col) => buildCol(art, col, false));
    seen.observe(art);
  };
  const replay = (id) => {
    (id ? [document.getElementById(id)] : $$("article.cmp")).forEach((art) => {
      if (art && art._built) $$(".tri > .col", art).forEach((col) => buildCol(art, col, true));
    });
  };
  const component = (id, fn) => {
    binders.set(id, fn);
    const art = document.getElementById(id);
    if (art && art._built) replay(id);
  };

  /* controls bar and the picks panel */
  const prefs = () => ({ theme: root.dataset.theme || "auto", motion: root.dataset.motion || "on", view: root.dataset.view || "desktop", one: root.dataset.one || "all" });
  const syncBar = () => {
    const now = prefs();
    $$("[data-set]").forEach((button) => button.setAttribute("aria-pressed", String(now[button.dataset.set] === button.value)));
    const note = $("#motion-note");
    if (note) note.textContent = reduced.matches ? "Reduced by your system" : "";
  };
  const initBar = () => {
    $$("[data-set]").forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.set;
      if (key === "theme" && button.value === "auto") delete root.dataset.theme; else root.dataset[key] = button.value;
      store(PREFS, prefs());
      syncBar();
      if (key === "motion") fireMotion();
      if (key === "one" && button.value !== "all") replay();
    }));
    // Phone: the secondary settings live in a sheet under the one-row bar.
    const moreToggle = $("[data-bar-more]");
    const more = $("#bar-more");
    if (moreToggle && more) {
      const setMore = (open) => { moreToggle.setAttribute("aria-expanded", String(open)); more.toggleAttribute("data-open", open); moreToggle.textContent = open ? "Close" : "Settings"; };
      moreToggle.addEventListener("click", () => setMore(moreToggle.getAttribute("aria-expanded") !== "true"));
      document.addEventListener("keydown", (event) => { if (event.key === "Escape" && more.hasAttribute("data-open")) { setMore(false); moreToggle.focus(); } });
      more.addEventListener("click", (event) => { if (event.target.closest("[data-replay-all], .jump a")) setMore(false); });
    }
    reduced.addEventListener("change", syncBar);
    const replayAll = $("[data-replay-all]");
    if (replayAll) replayAll.addEventListener("click", () => replay());
    const jump = $("[data-jump]");
    if (jump) {
      $$("section.group").forEach((group) => {
        const item = make("li");
        const link = make("a");
        link.href = `#${group.id}`;
        link.append(($("h2", group) || group).textContent.trim(), make("span", "", String($$("article.cmp", group).length)));
        link.addEventListener("click", () => { const details = jump.closest("details"); if (details) details.open = false; });
        item.append(link);
        jump.append(item);
      });
    }
    syncBar();
  };
  const initPanel = () => {
    const out = $("[data-picks-out]");
    const status = $("[data-picks-status]");
    const say = (text) => { if (status) status.textContent = text; };
    const exportButton = $("[data-picks-export]");
    const copyButton = $("[data-picks-copy]");
    const clearButton = $("[data-picks-clear]");
    if (exportButton) exportButton.addEventListener("click", () => { out.value = exportText(); say("Your picks are in the box below."); });
    if (copyButton) copyButton.addEventListener("click", async () => {
      out.value = exportText();
      try { await navigator.clipboard.writeText(out.value); say("Copied"); }
      catch (error) { out.select(); say(document.execCommand("copy") ? "Copied" : "Select the text and copy it"); }
    });
    let armed = 0;
    if (clearButton) clearButton.addEventListener("click", () => {
      if (!armed) {
        clearButton.textContent = "Press again to clear";
        armed = setTimeout(() => { armed = 0; clearButton.textContent = "Clear all"; }, 3000);
        return;
      }
      clearTimeout(armed);
      armed = 0;
      clearButton.textContent = "Clear all";
      picks = {};
      savePicks();
      $$(".pick input[type=radio]").forEach((input) => { input.checked = false; });
      $$(".pick input[type=text]").forEach((input) => { input.value = ""; });
      out.value = "";
      updateCount();
      say("All picks cleared");
    });
  };

  onMotion((active) => {
    if (active) return;
    $$(".col[data-enter='pending']").forEach((col) => delete col.dataset.enter);
    $$(".is-entering, .is-leaving, .is-switching-on, .is-switching-off").forEach((el) => el.classList.remove("is-entering", "is-leaving", "is-switching-on", "is-switching-off"));
  });

  Object.assign(Dir, {
    component, cells, setLevel, icon, morph, ICONS, runField, curves, order, fill, press, marker, onTick, loader,
    simulate, enter, leave, open, close, flash, placeholder, readMs, motionActive, onMotion, replay, pick
  });
  delete Dir._q;
  const init = () => {
    queue.forEach(([id, fn]) => binders.set(id, fn));
    initBar();
    $$("article.cmp").forEach(buildCmp);
    initPanel();
    updateCount();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
