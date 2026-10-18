// Usage: node scripts/build-pave-home-tree.mjs public/case-studies/pave-new-look/live/home-tree.html
// Rebuilds the portfolio deck's "home" slide body (branch tree + steps) as a standalone page.
// Geometry, markup, styles and motion are the deck's own (build.mjs branchTree, deck.css, motion.css).
import { writeFileSync } from "node:fs";
const BRANCHES = [
  ['drafting and lines', ['bg-drafting-sheet-1', 'bg-drafting-sheet-2', 'bg-drafting-sheet-3', 'grid-1A', 'grid-4A', 'grid-4C']],
  ['tiles and blocks', ['bg-laying-tiles-1', 'bg-laying-tiles-2', 'bg-laying-tiles-3', 'grid-3B', 'grid-3C', 'grid-5A']],
  ['paths and quiet', ['bg-the-path-1', 'bg-the-path-2', 'bg-the-path-3', 'bg-counter-nothing-1', 'bg-counter-nothing-2', 'bg-counter-nothing-3']],
  ['loud colour', ['bg-counter-green-field-1', 'bg-counter-green-field-2', 'bg-counter-green-field-3', 'bg-counter-three-squares-1', 'bg-counter-three-squares-2', 'bg-counter-three-squares-3']],
  ['daylight and poster', ['bg-counter-daylight-1', 'bg-counter-daylight-2', 'bg-counter-daylight-3', 'bg-counter-poster-2', 'bg-counter-poster-3', 'bg-counter-people-3']],
];
const T = '../tree/';
function branchTree() {
  const W = 1728, H = 560, cy = H / 2, x0 = 236, xf = 1384, t0 = 352, step = 150;
  const ys = BRANCHES.map((_, r) => 64 + r * ((H - 128) / (BRANCHES.length - 1)));
  const paths = ys.map((y, r) => `<path class="br" style="--r:${r}" pathLength="1" d="M${x0},${cy} H${x0 + 40} C${x0 + 96},${cy} ${x0 + 70},${y} ${t0 - 20},${y} H${xf - 120} C${xf - 60},${y} ${xf - 84},${cy} ${xf},${cy}"/>`).join('');
  const thumbs = BRANCHES.map(([label, list], r) => `<span class="bl" style="left:${t0 - 6}px;top:${ys[r] - 60}px;--r:${r}">${label}</span>` + list.map((n, k) => `<img class="th" src="${T}${n}.webp" alt="" decoding="async" data-name="${label[0].toUpperCase() + label.slice(1)} · ${k + 1} of ${list.length}" style="left:${t0 + k * step}px;top:${ys[r] - 42}px;--r:${r};--k:${k}">`).join('')).join('');
  return `<div class="lens"><div class="tree" style="width:${W}px;height:${H}px">
<svg class="tree-lines" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path class="trunk" pathLength="1" d="M${x0 - 6},${cy} H${x0 + 40}"/>${paths}</svg><i class="tree-wipe" aria-hidden="true"></i>
<div class="node start" style="top:${cy - 78}px"><img src="${T}home-before.webp" alt=""><span><b>Before</b> the gradient</span></div>
${thumbs}
<div class="node end" style="top:${cy - 112}px"><img src="${T}home-final.webp" alt=""><span><b>15 Oct</b> the blueprint, live</span></div></div></div>`;
}
const HOME_STEPS = [
  ['Since launch', 'Product leadership had wanted a better home than the gradient for a while'],
  ['Late Sep', 'I explored thirty coded directions, each one tunable live in light and dark'],
  ['29 Sep', 'Product leadership picks the blueprint'],
  ['Handoff', 'A coded prototype and my patches. There was no Figma file'],
  ['6 Oct', 'Engineering merges it with my patches, and the same engine goes to marketing'],
  ['15 Oct', 'Live for everyone. For the first time since launch, the website and the product look like one thing'],
];
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1728">
<title>Thirty coded directions, one blueprint</title>
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<style>
/* Rebuilt from the "Designing Pave" portfolio deck, slide "Blueprint home": deck.css and motion.css, unchanged
   apart from the stage size and a trigger that plays it when it scrolls into view. */
@font-face { font-family: "Geist"; src: url("./fonts/Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Geist Mono"; src: url("./fonts/GeistMono-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
:root {
  --page: #FAFAF7; --white: #FFFFFF; --paper: #F4F3EE;
  --ink: #111715; --ink-2: #474D52; --ink-3: #6B7480;
  --b1: rgba(17, 23, 21, 0.06); --b2: rgba(17, 23, 21, 0.14); --b3: rgba(17, 23, 21, 0.28);
  --green: #05875A;
  --font: "Geist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  --mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --ease-out: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-wipe: cubic-bezier(0.25, 1, 0.5, 1);
  --after-type: 0ms;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--page); overflow: hidden; }
body { font-family: var(--font); color: var(--ink); -webkit-font-smoothing: antialiased; }
.body { width: 1728px; display: flex; flex-direction: column; gap: 32px; padding: 0 0 8px; }

/* ---------- the home tree (deck.css) ---------- */
.tree { position: relative; flex: none; margin-top: 8px; }
.tree-lines { position: absolute; inset: 0; overflow: visible; }
.tree-lines path { fill: none; stroke: var(--b3); stroke-width: 1.25; }
.tree-lines .trunk { stroke: var(--green); stroke-width: 2; }
.tree .node { position: absolute; border: 1px solid var(--b2); border-radius: 6px; overflow: hidden; background: var(--white); box-shadow: 0 18px 36px -24px rgba(17, 23, 21, 0.45); }
.tree .node img { display: block; width: 100%; object-fit: cover; object-position: top left; }
.tree .node span { display: flex; gap: 8px; height: 28px; align-items: center; padding: 0 10px; font-size: 13px; color: var(--ink-2); }
.tree .node span b { font-family: var(--mono); font-weight: 500; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--green); }
.tree .start { left: 0; width: 230px; } .tree .start img { height: 128px; }
.tree .end { right: 0; width: 344px; border-color: rgba(5, 135, 90, 0.55); } .tree .end img { height: 196px; }
.tree .th { position: absolute; width: 134px; height: 84px; object-fit: cover; object-position: top left; border: 1px solid var(--b2); border-radius: 4px; background: var(--paper); }
.tree .bl { position: absolute; font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); }
.lens { position: relative; flex: none; width: 1728px; height: 560px; overflow: hidden; margin-top: 8px; }
.lens .tree { margin-top: 0; transform-origin: 0 0; }
.tree-wipe { position: absolute; left: 226px; top: -20px; width: 1560px; height: calc(100% + 40px); background: linear-gradient(to right, rgba(250, 250, 247, 0), var(--page) 120px); pointer-events: none; transform: translateX(1560px); }
.steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 28px; flex: none; border-top: 1px solid var(--b2); padding-top: 18px; }
.stp { display: flex; flex-direction: column; gap: 6px; }
.stp b { font-family: var(--mono); font-weight: 500; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--green); }
.stp span { font-size: 16px; line-height: 23px; color: var(--ink); }

/* ---------- motion (motion.css): runs only under [data-enter] ---------- */
@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes land { from { opacity: 0; transform: translate(0, -60px) scale(1.06); filter: blur(6px); } 50% { opacity: 1; } to { opacity: 1; transform: none; filter: none; } }
@keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes wipe { from { transform: none; } to { transform: translateX(1560px); } }
@keyframes camera {
  0% { transform: translate(591px, -308px) scale(2.1); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  14% { transform: translate(591px, -308px) scale(2.1); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  34% { transform: translate(-88px, -196px) scale(1.7); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  56% { transform: translate(-921px, -196px) scale(1.7); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  76% { transform: translate(-2100px, -252px) scale(1.9); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  86% { transform: translate(-2100px, -252px) scale(1.9); animation-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1); }
  100% { transform: none; }
}
[data-enter] .lens .tree { will-change: transform; animation: camera 5600ms both; animation-delay: calc(var(--after-type) + 100ms); }
[data-enter] .tree .start { animation: rise 520ms var(--ease-out) both; animation-delay: calc(var(--after-type) + 120ms); }
[data-enter] .lens .tree-wipe { animation: wipe 3400ms cubic-bezier(0.45, 0, 0.55, 1) both; animation-delay: calc(var(--after-type) + 500ms); }
[data-enter] .lens .tree .bl { animation: rise 400ms var(--ease-out) both; animation-delay: calc(var(--after-type) + 1500ms + var(--r) * 110ms); }
[data-enter] .lens .tree .th { animation: pop 420ms var(--ease-out) both; animation-delay: calc(var(--after-type) + 1700ms + var(--k) * 300ms + var(--r) * 60ms); }
[data-enter] .lens .tree .end { animation: land 760ms var(--ease-out) both; animation-delay: calc(var(--after-type) + 4000ms); }
[data-enter] .lens ~ .steps .stp { animation: rise 460ms var(--ease-out) both; animation-delay: calc(var(--after-type) + 5700ms + var(--s) * 140ms); }
/* before it plays, the tree waits at its first camera frame, so the reveal never flashes the finished state */
[data-wait] .lens .tree { transform: translate(591px, -308px) scale(2.1); }
[data-wait] .lens .tree-wipe { transform: none; }
[data-wait] :is(.tree .bl, .tree .th, .tree .end, .stp) { opacity: 0; }

/* Hover any direction for a larger look; the name says which family it came from. */
.tree .th { cursor: zoom-in; }
.peek { position: absolute; z-index: 5; width: 480px; padding: 8px 8px 10px; border: 1px solid var(--b2); border-radius: 6px; background: var(--white); box-shadow: 0 24px 48px -24px rgba(17, 23, 21, 0.5); pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity 140ms, transform 140ms var(--ease-out); }
.peek.is-on { opacity: 1; transform: none; }
.peek img { display: block; width: 100%; height: 300px; object-fit: cover; object-position: top left; border-radius: 3px; background: var(--paper); image-rendering: auto; }
.peek span { display: block; margin-top: 8px; font: 500 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--green); }
.replay { position: absolute; left: 0; top: 8px; z-index: 2; height: 32px; padding: 0 12px; border: 1px solid var(--b2); border-radius: 4px; background: var(--white); color: var(--ink-2); font: 500 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; opacity: 0; transition: opacity 200ms; }
body:not([data-driven]):hover .replay, .replay:focus-visible { opacity: 1; }
body[data-driven] .replay { display: none; }
.replay:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  [data-enter] *, [data-wait] * { animation: none !important; }
  [data-wait] .lens .tree, [data-wait] .lens .tree-wipe { transform: none; }
  [data-wait] .lens .tree-wipe { transform: translateX(1560px); }
  [data-wait] :is(.tree .bl, .tree .th, .tree .end, .stp) { opacity: 1; }
  .replay { display: none; }
}
</style>
</head>
<body data-wait>
<div class="body" role="img" aria-label="Before: the gradient home. Thirty coded directions in five families, converging on the blueprint home, live for everyone on 15 October.">
${branchTree()}
</div>
<button class="replay" type="button">Replay</button>
<div class="peek" aria-hidden="true"><img alt=""><span></span></div>
<script>
  // Two ways to run. Opened on its own it plays once in view (Replay to see it again). Embedded in
  // the case study, the host page drives it with its scroll position: window.__treeProgress(0…1)
  // scrubs the camera, the branches and the steps.
  const body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = () => { body.removeAttribute("data-enter"); void body.offsetWidth; body.removeAttribute("data-wait"); body.setAttribute("data-enter", ""); };
  const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !body.hasAttribute("data-driven")) { io.disconnect(); play(); } }, { threshold: 0.5 });
  io.observe(document.querySelector(".lens"));
  document.querySelector(".replay").addEventListener("click", play);

  let end = 0;
  window.__treeDriven = () => {
    if (body.hasAttribute("data-driven")) return;
    io.disconnect();
    body.setAttribute("data-driven", "");
    if (reduce) { body.removeAttribute("data-wait"); return; }
    play();
    const anims = document.getAnimations();
    anims.forEach((a) => a.pause());
    end = Math.max(...anims.map((a) => { const t = a.effect.getComputedTiming(); return t.endTime; }));
    window.__treeProgress(0);
  };
  window.__treeProgress = (p) => {
    if (reduce || !end) return;
    // Scroll starts once the gradient home has risen into the first camera frame, never on an empty one.
    const first = 700;
    const t = first + Math.max(0, Math.min(1, p)) * (end - first);
    document.getAnimations().forEach((a) => { a.currentTime = t; });
  };

  // The peek: a larger copy of whichever direction is under the pointer, kept inside the drawing.
  const peek = document.querySelector(".peek");
  const peekImg = peek.querySelector("img");
  const peekName = peek.querySelector("span");
  document.querySelectorAll(".tree .th").forEach((th) => {
    th.addEventListener("pointerenter", () => {
      peekImg.src = th.src; peekName.textContent = th.dataset.name || "";
      const r = th.getBoundingClientRect();
      const x = Math.min(innerWidth - 496, Math.max(8, r.left + r.width / 2 - 240));
      const y = r.top > 360 ? r.top - 350 : r.bottom + 8;
      peek.style.left = x + "px"; peek.style.top = y + "px";
      peek.classList.add("is-on");
    });
    th.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
  });
</script>
</body>
</html>
`;
writeFileSync(process.argv[2], html);
