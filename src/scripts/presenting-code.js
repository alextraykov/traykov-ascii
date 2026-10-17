import { getMotionState, onMotionChange } from "./motion/lifecycle.js";

const root = document.querySelector(".presenting-code-page");
const demos = new Map();
const reduced = () => { const state = getMotionState(); return state.reduced || state.paused; };
const initial = {
  hero: { kind: "camera" }, camera: { kind: "camera" },
  anchor: { kind: "anchor", target: "input" },
  layers: { kind: "layers" }, compare: { kind: "camera", before: true }
};

const captions = [
  "Flat: the complete interface, before its surfaces separate.",
  "Copies: each tagged level holds the same live component. The pixels still align.",
  "Tilt: one shared angle makes the relationship between surfaces visible.",
  "Lift: background, raised surfaces, dimmer and dialog separate into planes.",
  "Connect: measured drop lines tie each floating surface back to the ground."
];
const layerSection = document.querySelector(".pc-layers");
const sequence = document.querySelector("[data-pc-sequence]");
let manualLayers = false;
let scrollFrame = 0;
let sampling = false;
let comparisonVisible = false;
let savedSample = null;

function syncControls(name) {
  const demo = demos.get(name);
  if (!demo) return;
  const state = demo.api.state;
  (name === "layers" ? layerSection : demo.figure).querySelectorAll("[data-pc-action]").forEach((button) => {
    const action = button.dataset.pcAction;
    const value = button.dataset.value;
    const pressed = value === undefined ? (action === "theme" ? state.theme === "dark" : Boolean(state[action])) : String(state[action]) === value;
    button.setAttribute("aria-pressed", String(pressed));
  });
  if (name === "camera") demo.figure.querySelector("[data-pc-camera-readout]").textContent = state.target === "whole" ? "Whole screen · choose a component to frame" : `${state.target[0].toUpperCase() + state.target.slice(1)} · framed from the live component bounds`;
  if (name === "layers") {
    document.querySelectorAll("[data-pc-stage]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.pcStage) === state.stage)));
    document.querySelector("[data-pc-layer-caption]").textContent = captions[state.stage];
  }
}
function update(name, patch) {
  demos.get(name)?.api.update(patch);
  syncControls(name);
}
function canFollowScroll() {
  return !reduced() && window.innerWidth > 900 && window.innerHeight >= 740;
}
function syncSequenceMode() {
  const enabled = canFollowScroll() && demos.has("layers");
  layerSection.dataset.scrollEnabled = String(enabled);
  const resume = document.querySelector("[data-pc-resume]");
  resume.hidden = !enabled;
  resume.disabled = !manualLayers;
  document.querySelector("[data-pc-scroll-status]").textContent = enabled ? "Scroll through the stages, or choose one." : "Choose a stage to open the stack.";
}
function chooseStage(stage, manual = true) {
  if (manual) manualLayers = true;
  const current = demos.get("layers")?.api.state;
  if (!current) return;
  const next = Math.min(4, Math.max(0, stage));
  update("layers", { stage: next, focus: "", region: "", hoverFocus: "", hoverRegion: "", xray: false, instant: false, cut: reduced() ? current.cut + 1 : current.cut });
  syncSequenceMode();
}
function followScroll() {
  scrollFrame = 0;
  if (!canFollowScroll() || manualLayers || !demos.has("layers")) return;
  const rect = sequence.getBoundingClientRect();
  const sticky = sequence.querySelector(".pc-layer-sticky");
  const top = parseFloat(getComputedStyle(sticky).top) || 0;
  const travel = Math.max(1, rect.height - sticky.offsetHeight);
  const progress = Math.max(0, Math.min(1, (top - rect.top) / travel));
  const stage = Math.min(4, Math.floor(progress * 5));
  if (demos.get("layers").api.state.stage !== stage) chooseStage(stage, false);
}
function requestScrollSync() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(followScroll);
}
function reportSample(sample) {
  if (!sampling) return;
  savedSample = sample;
  update("compare", { sampleReading: sample.frames ? `${sample.frames.avg.toFixed(1)} ms avg · ${sample.frames.worst.toFixed(1)} ms worst · sample stopped` : "Sample stopped" });
  document.querySelector("[data-pc-frame-reading]").textContent = sample.frames ? `${sample.frames.avg.toFixed(1)} ms avg / ${sample.frames.worst.toFixed(1)} ms worst` : "Collecting frames…";
  document.querySelector("[data-pc-task-reading]").textContent = sample.supportedLongTasks ? String(sample.longTasks) : "Unsupported in this browser";
  document.querySelector("[data-pc-text-reading]").textContent = `${sample.doubledNow} now / ${sample.doubledWorst} peak`;
}
function setSampling(next, reason = "Stopped") {
  const status = document.querySelector("[data-pc-probe-status]");
  if (next) {
    // Refresh visibility if a click follows a scroll before the observer delivers its new state.
    const rect = demos.get("compare")?.artwork.getBoundingClientRect();
    comparisonVisible = Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth);
    if (document.hidden || !comparisonVisible) {
      status.textContent = document.hidden ? "Return to this page, then start a sample." : "Keep the comparison in view, then start a sample.";
      return;
    }
  }
  sampling = next;
  update("compare", { running: next });
  const button = document.querySelector("[data-pc-probe]");
  button.textContent = next ? "Stop sample" : "Start sample";
  button.setAttribute("aria-pressed", String(next));
  status.textContent = next ? "Sampling this browser" : savedSample ? reason : "Not sampling";
}

function reportPoint(event) {
  if (event.type === "open") { chooseStage(4); return; }
  if (event.type !== "point") return;
  // Passive pointing must not change scroll ownership or the sticky layout.
  if (event.pinned) manualLayers = true;
  const patch = event.pinned ? { focus: event.focus, region: event.region, hoverFocus: "", hoverRegion: "", instant: false } : { hoverFocus: event.focus, hoverRegion: event.region };
  const current = demos.get("layers")?.api.state;
  if (!current || Object.entries(patch).every(([key, value]) => current[key] === value)) return;
  update("layers", patch);
  if (event.pinned) syncSequenceMode();
}

async function initialize() {
  if (!root) return;
  const runtimeURL = "/labs/presenting-in-code/web/runtime-api.js";
  const { createArtwork } = await import(/* @vite-ignore */ runtimeURL);
  await Promise.all(Object.entries(initial).map(async ([name, settings]) => {
    const artwork = document.querySelector(`[data-pc-artwork="${name}"]`);
    const figure = document.querySelector(`[data-pc-demo="${name}"]`);
    try {
      const api = await createArtwork(artwork.querySelector("[data-pc-mount]"), { ...settings, name, tapTarget: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-target")) || 44, reduced: reduced(), controlDuration: getComputedStyle(document.documentElement).getPropertyValue("--dur-2").trim(), transitionDuration: getComputedStyle(document.documentElement).getPropertyValue("--dur-4").trim(), staggerDuration: getComputedStyle(document.documentElement).getPropertyValue("--stagger-1").trim() }, (event) => {
        if (name === "layers") reportPoint(event);
        else if (event.type === "change") update(name, event.patch);
        else if (event.type === "sampling") setSampling(event.running);
        else if (event.type === "sample") reportSample(event);
      });
      demos.set(name, { api, figure, artwork });
      artwork.dataset.ready = "true";
      figure.querySelectorAll("[data-pc-controls]").forEach((item) => item.hidden = false);
      (name === "layers" ? layerSection : figure).addEventListener("click", (event) => {
        const button = event.target.closest("[data-pc-action]");
        if (!button) return;
        const action = button.dataset.pcAction;
        const value = button.dataset.value;
        const state = api.state;
        const next = value === undefined ? (action === "theme" ? state.theme === "dark" ? "light" : "dark" : !state[action]) : value === "true" ? true : value === "false" ? false : value;
        if (name === "layers") {
          manualLayers = true;
          syncSequenceMode();
        }
        update(name, { [action]: next, instant: false, ...(name === "layers" && action === "xray" && next ? { stage: 0, focus: "", region: "", blueprint: false } : {}), ...(name === "layers" && action === "blueprint" && next ? { stage: 4, xray: false } : {}) });
      });
      syncControls(name);
    } catch (error) {
      console.error(`Could not initialize ${name} demonstration`, error);
      artwork.dataset.ready = "false";
    }
  }));
  if (demos.has("layers")) {
    layerSection.querySelectorAll("[data-pc-controls]").forEach((item) => item.hidden = false);
    document.querySelectorAll("[data-pc-stage]").forEach((button) => { button.disabled = false; button.addEventListener("click", () => chooseStage(Number(button.dataset.pcStage))); });
    document.querySelector("[data-pc-resume]").addEventListener("click", () => { manualLayers = false; syncSequenceMode(); followScroll(); });
    window.addEventListener("scroll", requestScrollSync, { passive: true });
    window.addEventListener("resize", () => { syncSequenceMode(); requestScrollSync(); }, { passive: true });
    syncSequenceMode();
    requestScrollSync();
  }
  if (demos.has("compare")) {
    document.querySelector(".pc-frame-check [data-pc-controls]").hidden = false;
    document.querySelector("[data-pc-probe]").addEventListener("click", () => setSampling(!sampling));
    const visible = new IntersectionObserver(([entry]) => {
      comparisonVisible = entry.isIntersecting;
      if (!comparisonVisible && sampling) setSampling(false, "Stopped · demo left view");
    });
    visible.observe(demos.get("compare").artwork);
    document.addEventListener("visibilitychange", () => { if (document.hidden && sampling) setSampling(false, "Stopped · page hidden"); });
  }
  onMotionChange((state) => {
    const reduce = state.reduced || state.paused;
    demos.forEach(({ api }) => api.update({ reduced: reduce, hoverFocus: "", hoverRegion: "" }));
    if (reduce) manualLayers = true;
    syncSequenceMode();
  });
}

// Skills remain native disclosures; copying is an optional enhancement.
root?.querySelectorAll("[data-pc-copy]").forEach((button) => {
  button.hidden = false;
  button.addEventListener("click", async () => {
    const code = root.querySelector(`[data-pc-skill-source="${button.dataset.pcCopy}"]`);
    const status = button.closest(".pc-actions").querySelector("[data-pc-copy-status]");
    try {
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = "Copied";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges(); selection.addRange(range);
      status.textContent = "Select and copy the text below.";
    }
  });
});
initialize().catch((error) => console.error("Tutorial enhancement unavailable", error));
