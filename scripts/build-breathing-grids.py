#!/usr/bin/env python3
"""Package only the public Blocks/Dither studies; source stays outside the site."""
from pathlib import Path
import re,sys
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Desktop/breathing-grids'
out=Path(__file__).resolve().parents[1]/'public/case-studies/breathing-grids'
out.mkdir(parents=True,exist_ok=True)
core=(source/'source/core.js').read_text()
hooks=(source/'source/hooks.js').read_text().split('/* ---------- 5 · LOUD')[0]
engine=(source/'source/engine.js').read_text()
engine=re.sub(r"^  \{ n: [145],.*\n",'',engine,flags=re.M)
# No unreleased renderer or registry is shipped. Its generic colour slot is unused.
core=re.sub(r'^  p\.bp = .*\n','',core,flags=re.M)
engine=re.sub(r'^.*blueprint.*\n',lambda m: '  audit: () => {\n' if 'audit: () =>' in m[0] else '',engine,flags=re.M)
engine=engine.replace('if (!still) raf = requestAnimationFrame(frame);','if (!still && !HOST.paused) raf = requestAnimationFrame(frame);')
engine=engine.replace('function wake() { if (!raf)', 'function wake() { if (!HOST.paused && !raf)')
engine=engine.replace('  events = events.filter((e) => !e.done);\n  const ls = lineSet(), rw = rows(T);', '  events = events.filter((e) => !e.done);\n  advanceReseed(T);\n  const ls = lineSet(), rw = rows(T);')
engine=engine.replace("fromCode(q.get('v'))", "fromCode(window.__gridVariant)")
engine=engine.replace("addEventListener('resize', () => { layout(); wake(); });", "addEventListener('resize', () => { TUNE.unit=Math.min(128,Math.max(72,innerWidth/4)); TUNE.minH=Math.min(130,innerHeight/4); layout(); if (still) seedStill(); else if (HOST.paused) seedPaused(); wake(); });")
engine=engine.replace('/* ============================================================ frame */', r'''/* Embed controls: a pause freezes source clocks; a new layout runs the
   source cell exit followed by the source sheet arrival. */
let reseedFlow = null;
function resetSeed(nextSeed) {
  seed = nextSeed; firstK = 0; firstX = -U * 3; drift = 0; events = [];
  Object.keys(rowOff).forEach((key) => delete rowOff[key]);
  arriveT0 = clock; nextOpen = clock + ARRIVE_MS + 300;
}
function advanceReseed(T) {
  const flow = reseedFlow; if (!flow) return;
  if (flow.phase === 'closing') {
    if (events.length) return;
    resetSeed(flow.seed); flow.phase = 'arriving'; flow.until = clock + ARRIVE_MS + 300;
    return;
  }
  if (flow.phase !== 'arriving' || T < flow.until) return;
  if (flow.queued) {
    flow.queued = false; flow.phase = 'closing';
    events.forEach((ev) => { ev.keep = false; exitNow(ev, clock); });
    return;
  }
  reseedFlow = null; auto = true; HOST.paused = flow.returnPaused;
  if (!HOST.paused) nextOpen = clock;
  flow.resolve();
}
function reseedTransition(nextSeed) {
  const next = Number.isFinite(+nextSeed) ? (+nextSeed | 0) : ((Math.random() * 1e6) | 0);
  if (still || HOST.paused) {
    if (reseedFlow) { reseedFlow.resolve(); reseedFlow = null; }
    resetSeed(next);
    if (still) seedStill(); else seedPaused();
    frame(performance.now()); return Promise.resolve();
  }
  if (reseedFlow) { reseedFlow.seed = next; reseedFlow.queued = true; return reseedFlow.promise; }
  let resolve; const promise = new Promise((done) => { resolve = done; });
  reseedFlow = { seed: next, phase: 'closing', returnPaused: !!HOST.paused, queued: false, promise, resolve };
  auto = false; events.forEach((ev) => { ev.keep = false; exitNow(ev, clock); });
  advanceReseed(clock); wake(); return promise;
}
function inspectCell() {
  auto = false; events = [];
  if (!spawn(clock, { any: true, keep: true, prefer: (a, b) => b.fw * b.h - a.fw * a.h })) return null;
  const ev = events[events.length - 1];
  if (ev.pend) buildEvent(ev);
  ev.t0 = clock - T_BUILD0 - (ev.style.buildMs + 400) / TUNE.buildSpeed;
  ev.exitAt = 1e9; phase(ev, clock, 0);
  return ev.t0;
}
function settlePausedEvent(ev) {
  if (ev.pend) buildEvent(ev);
  ev.t0 = clock - T_BUILD0 - (ev.style.buildMs + 400) / TUNE.buildSpeed;
  ev.exitAt = 1e9; ev.keep = true; ev.embedStatic = true; phase(ev, clock, 0);
}
function seedPaused() {
  events = []; auto = false;
  for (let k = 0; k < 3; k++) {
    if (!spawn(clock, { any: true, keep: true })) break;
    settlePausedEvent(events[events.length - 1]);
  }
}
/* ============================================================ frame */''')
engine=engine.replace('window.__grid = {', '''window.__grid = {
  playback: (playing) => {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (playing && still && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      still = false; events.forEach(settlePausedEvent);
    }
    HOST.paused = !playing;
    if (reseedFlow) reseedFlow.returnPaused = !playing;
    if (playing) {
      const staticCells = events.filter((ev) => ev.embedStatic);
      staticCells.forEach((ev) => { ev.embedStatic = false; ev.keep = false; ev.exitAt = (clock - ev.t0) + TUNE.hold * 1000; });
      if (staticCells.length) auto = true;
      wake();
    } else frame(performance.now());
  },
  reseedTransition,
  cancelReseed: () => { const pending = reseedFlow; reseedFlow = null; pending?.resolve(); },
  inspectCell,
  resetScene: () => { events = []; auto = false; speed = 1; },
  viewport: () => ({ w: W, h: H, scale: HOST.displayScale || 1 }),
  openCell: () => {
    if (events.length >= 3) events.shift();
    const count = events.length; spawn(clock,{any:true,keep:still});
    if (HOST.paused && !still && events[count]) settlePausedEvent(events[count]);
    if(HOST.paused) frame(performance.now()); else wake();
  },
''')
for tag,body in [('DRAFTING',''),('OPPOSITES',''),('HOOKS',hooks),('ENGINE',engine)]:core=core.replace('/*@@'+tag+'@@*/',body)
# Line tiling stays a shared drawing helper, never a selectable direction.
film=(source/'source/film.js').read_text()
film=film[film.index('(() => {'):]  # The source loop is replaced by the short introduction below.
film=film.replace('if (!sk.id) return;', 'if (sk.id === null) return;')
film=film.replace('hair = 1 / z, dpr', 'hair = 1 / z / G.viewport().scale, dpr')
film=film.replace("ctx.fillStyle = green(1); ctx.fillText(dl, c.fx + c.fw - pd - ctx.measureText(dl).width, hy);", "if(right-left > ctx.measureText(name + ' ' + dl).width + pd) { ctx.fillStyle = green(1); ctx.fillText(dl, right - ctx.measureText(dl).width, hy); }")
film=film.replace("`motion · timing · ${n} parts · ${STEP} ms per module · ${PIECE_MS} ms per part · expo out`", "(innerWidth < 640 ? `${n} parts` : `motion · timing · ${n} parts · ${STEP} ms per module · ${PIECE_MS} ms per part · expo out`)")
film=film.replace("`${Math.round(sk.tau)} ms · shown at ${Math.round(sk.slow * 100)}%`", "(innerWidth < 640 ? `${Math.round(sk.tau)} ms` : `${Math.round(sk.tau)} ms · shown at ${Math.round(sk.slow * 100)}%`)")
film=film.replace('innerWidth < 640', 'G.viewport().w * G.viewport().scale < 640')
film=film.replace("ctx.fillText(p.fg ? NAMES[p.type] : 'Rest', c.fx + pd, hy);", "const name = p.fg ? NAMES[p.type] : 'Rest', left = Math.max(c.fx,r.x)+pd, right = Math.min(c.fx+c.fw,r.x+r.w)-pd; const short = {square:'□',quarter:'¼',half:'½',disc:'○',bar:'Bar',halfpair:'2×¼',disc4:'4×¼',arch:'∩'}; if(right>left) ctx.fillText(ctx.measureText(name).width <= right-left ? name : (p.fg ? short[p.type] : '–'), left, hy);")

# Keep the wireframe's labels inside the visible cell and omit collisions on phones.
film=film.replace('      named.forEach((p, n) => {', '      const placed = [];\n      named.forEach((p, n) => {')
film=film.replace("if (k > 0) tag(`${NAMES[p.type]} · ${p.cw}×${p.ch}`, X0 + p.i * M + 6 * hair, Y0 + p.j * M + 6 * hair, k);", "if (k > 0) { const text = `${NAMES[p.type]} · ${p.cw}×${p.ch}`, w = tagW(text), x = Math.max(r.x + 3 * hair, Math.min(X0 + p.i * M + 6 * hair, r.x + r.w - w - 3 * hair)), y = Math.max(r.y + 3 * hair, Math.min(Y0 + p.j * M + 6 * hair, r.y + r.h - tagH - 3 * hair)); if (w < r.w - 6 * hair && !placed.some((b) => x < b.x + b.w + 3 * hair && x + w + 3 * hair > b.x && y < b.y + tagH + 3 * hair && y + tagH + 3 * hair > b.y)) { tag(text, x, y, k); placed.push({x,y,w}); } }")

old_clock = '''  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /* a real-time tween (the engine's clock may be stopped while it runs) */
  const tween = (ms, fn, ease = EASE.io) => new Promise((done) => {
    const t0 = performance.now();
    const step = () => { const p = clamp01((performance.now() - t0) / ms); fn(ease(p), p); if (p < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  });'''
new_clock = r'''  const PACE = 0.6;
  const FILM_STOP = Symbol('film stopped');
  const director = (() => {
    let playing = false, last = 0, now = 0, raf = 0;
    const jobs = new Set();
    const schedule = () => { if (playing && !raf && jobs.size) raf = requestAnimationFrame(step); };
    const step = (at) => {
      raf = 0; if (!playing) return;
      now += Math.min(64, Math.max(0, at - (last || at))); last = at;
      [...jobs].forEach((job) => job.tick(now)); schedule();
    };
    const add = (job) => { jobs.add(job); schedule(); };
    const api = {
      play: (value) => { playing = value; last = 0; if (!playing) { cancelAnimationFrame(raf); raf = 0; } else schedule(); },
      wait: (ms) => new Promise((resolve, reject) => {
        const due = now + ms * PACE;
        const job = { tick: (time) => { if (time >= due) { jobs.delete(job); resolve(); } }, reject };
        add(job);
      }),
      tween: (ms, fn, ease) => new Promise((resolve, reject) => {
        const start = now, duration = ms * PACE;
        const job = { tick: (time) => { const p = clamp01((time - start) / duration); fn(ease(p), p); if (p >= 1) { jobs.delete(job); resolve(); } }, reject };
        add(job);
      }),
      cancel: () => { cancelAnimationFrame(raf); raf = 0; [...jobs].forEach((job) => job.reject(FILM_STOP)); jobs.clear(); },
      reset: () => { api.cancel(); now = 0; last = 0; },
      status: () => ({ time: now, playing, jobs: jobs.size }),
    };
    return api;
  })();
  const wait = (ms) => director.wait(ms);
  const tween = (ms, fn, ease = EASE.io) => director.tween(ms, fn, ease);'''
if old_clock not in film: raise SystemExit('Could not locate source film clock')
film=film.replace(old_clock,new_clock)
film=film.replace('G.timeScale(out ? k : 1 - k);','G.timeScale((out ? k : 1 - k) / PACE);')
film=film.replace("const view = () => ({ x: innerWidth / 2, y: innerHeight / 2 });", "const view = () => { const v = G.viewport(); return { x: v.w / 2, y: v.h / 2 }; };")
film=film.replace("Math.min((innerWidth * 0.8) / rect.w, (innerHeight * 0.8) / rect.h, 3.4)", "Math.min((G.viewport().w * 0.8) / rect.w, (G.viewport().h * 0.8) / rect.h, 3.4)")
film=film.replace("const visible = () => ({ x: cam.fx - innerWidth / 2 / cam.z, y: cam.fy - innerHeight / 2 / cam.z, w: innerWidth / cam.z, h: innerHeight / cam.z });", "const visible = () => { const v = G.viewport(); return { x: cam.fx - v.w / 2 / cam.z, y: cam.fy - v.h / 2 / cam.z, w: v.w / cam.z, h: v.h / cam.z }; };")
film=film.replace("const W = () => innerWidth;", "const W = () => G.viewport().w;")
film=film.replace("G.pick('3B'); G.auto(false); G.timeScale(1);", "G.pick('3B'); G.auto(false); G.timeScale(1 / PACE);")
# Keep the source geometry renderer, with a single short introduction.
film = film.split('  /* ---------- casting: which cells open ---------- */')[0]
film += r'''  let mode = 'film', started = false, finished = false, inspectStage = 'geometry', inspectProgress = 1, requested = false, reseedEpoch = 0, reseedPending = false;
  const announce = () => parent.postMessage({ channel: 'breathing-grid', instance: new URLSearchParams(location.search).get('instance'), finished }, '*');
  const resetVisual = () => {
    Object.assign(sk, { id: null, veil: 0, trace: 0, lattice: 0, latticeOut: false, latticeA: 1, marks: 0, labels: 0, paper: 0, lib: 0, cards: 0, graph: 0, timeline: 0, tau: FULL });
    const v = view(); cam.z = 1; cam.fx = v.x; cam.fy = v.y; applyCam();
  };
  const prepare = () => {
    G.playback(false); resetVisual(); sk.veil = 1.25; sk.id = G.inspectCell(); G.renderNow();
  };
  const geometry = (k) => {
    if (!G.cell(sk.id)?.rect) prepare();
    const r = G.cell(sk.id)?.rect; if (!r) return;
    const v = G.viewport(), target = Math.min(v.w * .88 / r.w, v.h * .62 / r.h, 3.4);
    cam.z = target ** k; cam.fx = v.w / 2 + (r.x + r.w / 2 - v.w / 2) * k; cam.fy = v.h / 2 + (r.y + r.h / 2 - v.h / 2) * k; applyCam();
    Object.assign(sk, { veil: 1.25 - .25 * k, trace: k, lattice: k, marks: k, labels: k }); G.renderNow();
  };
  const complete = () => {
    geometry(1); finished = true; started = true; director.play(false); G.playback(false); announce();
  };
  const run = async () => {
    try {
      await wait(200 / PACE);
      prepare();
      await tween(680 / PACE, geometry, EASE.io);
      complete();
    } catch (error) { if (error !== FILM_STOP) throw error; }
  };
  const start = () => {
    if (finished) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { director.cancel(); prepare(); complete(); return; }
    if (started) { director.play(true); return; }
    mode = 'film'; started = true; director.reset(); resetVisual(); G.playback(false); G.resetScene(); G.seek(G.clock() + 2000); G.renderNow(); director.play(true); run();
  };
  const replay = () => {
    reseedEpoch++; reseedPending = false; G.cancelReseed(); director.cancel(); G.playback(false);
    mode = 'film'; started = false; finished = false; resetVisual(); G.resetScene(); G.renderNow(); announce();
  };
  function inspect(next = 'geometry', progress = 1) {
    if (reseedPending) { reseedEpoch++; reseedPending = false; G.cancelReseed(); }
    inspectStage = next; inspectProgress = progress;
    if (mode !== 'inspect' || sk.id === null || !G.cell(sk.id)) {
      director.cancel(); started = false; finished = false; mode = 'inspect'; prepare();
    }
    const ev = G.cell(sk.id); if (!ev?.rect || !ev.st?.comp) return;
    const r = ev.rect, v = G.viewport(); cam.z = Math.min(v.w * .88 / r.w, v.h * .62 / r.h, 3.4);
    cam.fx = r.x + r.w / 2; cam.fy = r.y + r.h / 2; applyCam();
    Object.assign(sk, { veil: next === 'geometry' ? 1 : 0, trace: next === 'geometry' ? 1 : 0, lattice: next === 'geometry' ? 1 : 0, latticeA: 1, marks: next === 'geometry' ? 1 : 0, labels: next === 'geometry' ? 1 : 0, paper: next === 'timing' ? 1 : 0, lib: next === 'timing' ? 1 : 0, cards: next === 'timing' ? 1 : 0, graph: next === 'timing' ? 1 : 0, timeline: next === 'timing' ? 1 : 0, tau: buildEnd(ev.st.comp.pieces) * progress });
    G.renderNow(); return { parts: ev.st.comp.pieces.filter((p) => p.fg).length, duration: buildEnd(ev.st.comp.pieces) };
  }
  const reseed = async (nextSeed, play) => {
    const keepInspecting = mode === 'inspect', epoch = ++reseedEpoch;
    requested = play; reseedPending = true; director.cancel(); started = false; finished = false; G.playback(false); resetVisual();
    try {
      await G.reseedTransition(nextSeed);
      if (epoch !== reseedEpoch) return;
      reseedPending = false;
      if (keepInspecting) { sk.id = null; inspect(inspectStage, inspectProgress); }
      else if (requested && !matchMedia('(prefers-reduced-motion: reduce)').matches) start();
      else { prepare(); complete(); }
    } finally { if (epoch === reseedEpoch) reseedPending = false; }
  };
  const refresh = () => {
    if (mode === 'inspect') inspect(inspectStage, inspectProgress);
    else if (finished) geometry(1);
    else G.renderNow();
  };
  window.__film = { draw, state: sk, cam, inspect, reseed, replay, refresh,
    playback: (playing) => {
      requested = playing;
      if (reseedPending) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches && mode === 'film' && !finished) { director.cancel(); prepare(); complete(); return; }
      if (!playing) { director.play(false); G.playback(false); return; }
      start();
    },
    status: () => ({ mode, started, finished, ...director.status(), id: sk.id, veil: sk.veil, lattice: sk.lattice, cards: sk.cards, graph: sk.graph }),
  };
})();'''
head=(source/'blocks.html').read_text().split('<script>')[0]
head=re.sub(r'<link[^>]*>\n','',head)
head=head.replace('<canvas id="field" aria-hidden="true">','<canvas id="field" role="img" aria-label="Interactive modular grid">')
head=head.replace('<title>Blocks</title>','<title>Breathing grids</title>')
host=re.search(r'window.__gridHost = Object.assign\((.*?)</script>',(source/'blocks.html').read_text(),re.S)[0].removesuffix('</script>')
host += '\nwindow.__gridHost.tune.unit=Math.min(128,Math.max(72,innerWidth/4)); window.__gridHost.tune.minH=Math.min(130,innerHeight/4); window.__gridHost.paused=true; window.__gridHost.overlay=(c,s)=>window.__film?.draw(c,s);\n'
for name,variant in [('blocks','3B'),('dither','3C'),('film','3B')]:
 defaults=f"window.__gridVariant='{variant}';"
 page=head+'<script>'+defaults+'</script><script>'+host+'</script><script>'+core+'</script>'
 if name=='film':page+='<script>'+film+'</script>'
 page+='<script>'+(out/'host.js').read_text()+'</script></body></html>'
 assert not re.search(r'Blueprint|blueprint|const Poster|subs: \[LineTiling\]',page)
 (out/(name+'.html')).write_text(page)
print('Built public Blocks, Dither and interactive construction inspector.')

