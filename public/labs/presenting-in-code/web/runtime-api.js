/*
 * Website adapter for Alexander Traykov's supplied tutorial primitives.
 * MIT; the imported distribution retains its third-party notices.
 * No deck host, router, slide canvas, global theme provider or iframe is mounted here.
 */
import {
  React, jsxRuntime, ReactDOM, Camera, BlueprintScreen, LayerStage, useFrameProbe,
  measureAnchor, Screens, proposedFix, beforeFix, layerFix, implicit, cameraStops,
  planes, Views, Explode, anchorFix, supportsLongTasks, projectTargets, layerSubject
} from "../deck/assets/tutorial.js";
const { jsx, jsxs } = jsxRuntime;
const styleURL = new URL("../deck/assets/tutorial.css", import.meta.url);
const sourceStyle = fetch(styleURL).then((response) => {
  if (!response.ok) throw new Error("Tutorial styles could not load.");
  return response.text();
}).then((css) => css.replaceAll(":root", ":host"));

// Only the original drawing uses source coordinates. Controls retain native text size.
const boundaryStyle = `
:host { display: block; width: 100%; height: 100%; overflow: clip; }
.lld-deck.web-art { position: relative; inset: auto; width: 100%; height: 100%; min-height: 0; overflow: clip; padding: 0; margin: 0; border-radius: 0; --font-family-base: "Geist Sans", sans-serif; --font-family-mono: "Geist Mono", monospace; }
.web-art, .web-art * { box-sizing: border-box; }
.web-art__camera, .web-art__probe { width: 100%; height: 100%; }
.web-art__probe { position: relative; display: flex; flex-direction: column; }
.web-art__viewport { position: relative; flex: 1; min-height: 0; overflow: clip; }
.web-art__drawing, .web-art__screen-targets { position: absolute; inset: 0; }
.web-art__screen-targets { pointer-events: none; }
.web-art__screen-target { position: absolute; padding: 0; border: 0; background: transparent; cursor: pointer; pointer-events: auto; }
.web-art__screen-target:focus-visible { outline: var(--lld-blueprint-width) solid var(--lld-hover-ring); outline-offset: var(--lld-blueprint-width); }
.web-art__screen-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); background: var(--layer-frame-bg); color: var(--text-text-primary); font: 500 12px/1.4 var(--font-family-base); }
.web-art__screen-status { flex: 1; min-width: 0; }
.web-art__screen-toolbar .web-art__reset { font: inherit; }
.web-art__reset:disabled { cursor: default; color: var(--text-text-secondary); }
.web-art__sample-reading { padding: var(--spacing-xs) var(--spacing-sm); background: var(--layer-frame-bg); color: var(--text-text-primary); font: 400 12px/1.4 var(--font-family-mono); }
.web-art__camera { border-radius: 0; box-shadow: none; }
.web-art .lld-stage__flat { border-radius: 0; box-shadow: none; }
.web-art__marks { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; }
.web-art__marks rect, .web-art__marks path { fill: none; stroke: var(--lld-hover-ring); stroke-width: 2; vector-effect: non-scaling-stroke; }
.web-art__marks circle { fill: var(--lld-hover-ring); }
.web-art__annotation { position: relative; align-self: center; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--spacing-xs); margin: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--layer-floating-bg); border: var(--layer-floating-edge); color: var(--text-text-primary); font: 400 13px/1.4 var(--font-family-base); }
.web-art__annotation b { font-weight: 600; }
.web-art__annotation span { color: var(--text-text-secondary); }
.web-art__layer-world { position: absolute; inset: 0; transform-origin: 0 0; transition: transform var(--lld-duration-zoom) var(--lld-ease-camera); }
.web-art__open { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: transparent; cursor: pointer; display: flex; justify-content: center; align-items: end; padding: var(--spacing-lg); }
.web-art__open span { padding: var(--spacing-sm) var(--spacing-md); background: var(--layer-floating-bg); color: var(--text-text-primary); border: var(--layer-floating-edge); font: 500 14px/1.4 var(--font-family-base); }
.web-art__inspection { position: absolute; top: var(--spacing-md); right: var(--spacing-md); max-width: calc(100% - var(--spacing-md) * 2); display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--layer-floating-bg); border: var(--layer-floating-edge); color: var(--text-text-primary); font: 500 14px/1.4 var(--font-family-base); pointer-events: none; }
.web-art__reset { padding: var(--spacing-sm); min-height: var(--tap-target); scroll-margin-block: calc(var(--tap-target) + var(--spacing-lg)); border: var(--layer-floating-edge); background: var(--layer-floating-bg); color: inherit; font: inherit; cursor: pointer; pointer-events: auto; }
.web-art .lld-stack--levels[data-web-projected] { transform: none !important; transform-style: flat; }
.web-art .lld-stack--levels[data-web-projected] > .lld-plane { transform: var(--web-plane-transform) !important; transform-origin: 0 0; }
.web-art__interaction { position: absolute; inset: 0; }
.web-art__hits { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; }
.web-art__hit { fill: transparent; stroke: none; pointer-events: visibleFill; cursor: pointer; }
.web-art__hit:focus { outline: none; }
.web-art__hit:focus-visible { stroke: var(--lld-hover-ring); stroke-width: var(--lld-blueprint-width); }
.web-art__highlight { fill: var(--lld-hover-fill); stroke: var(--lld-hover-ring); stroke-width: 2; vector-effect: non-scaling-stroke; pointer-events: none; }
.web-art__target { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.web-art__target polygon { fill: var(--lld-hover-fill); stroke: var(--lld-hover-ring); stroke-width: 2; vector-effect: non-scaling-stroke; }
.web-art__target path { fill: none; stroke: var(--lld-hover-ring); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.web-art[data-outlines="true"] [data-morph] { outline: var(--lld-blueprint-width) solid var(--lld-hover-ring); outline-offset: var(--lld-blueprint-width); }
.web-art[data-motion="reduce"] *, .web-art[data-motion="reduce"] *::before, .web-art[data-motion="reduce"] *::after { animation: none !important; transition: none !important; }
`;

const stops = [cameraStops.input, cameraStops.panel, cameraStops.cards];
const stopIndex = { input: 0, panel: 1, cards: 2 };
const common = { screen: Screens.CHAT, screenComponent: BlueprintScreen, implicit };

const targetNames = { input: "Input", panel: "Panel", cards: "Cards" };
// Use the original named targets, but measure the entire component (the deck's
// panel close-up intentionally cropped its top edge for a different slide beat).
const anchorTargets = stops.map((stop) => ({ ...stop, target: { selector: stop.target.selector } }));
function CameraArtwork({ state, report }) {
  const holder = React.useRef(null);
  const viewport = React.useRef(null);
  const annotation = React.useRef(null);
  const sample = useFrameProbe(Boolean(state.running), holder);
  const [geometry, setGeometry] = React.useState({ targets: [], ring: null });
  const [measuredStops, setMeasuredStops] = React.useState(stops);
  const [hover, setHover] = React.useState("");
  const pointer = React.useRef(null);
  const isAnchor = state.kind === "anchor";
  const isComparison = state.name === "hero" || state.name === "compare";
  const at = isAnchor || isComparison ? null : stopIndex[state.target] ?? null;
  const selected = targetNames[state.target];
  const act = (patch) => report({ type: "change", patch });
  const activate = (target) => { setHover(""); act(isComparison ? { before: !state.before } : { target }); };
  const reset = () => { setHover(""); act({ target: "whole" }); };
  React.useEffect(() => {
    if (state.running) report({ type: "sample", ...sample, supportedLongTasks: supportsLongTasks() });
  }, [sample, state.running, report]);
  React.useLayoutEffect(() => {
    const node = holder.current, view = viewport.current;
    if (!node || !view) return;
    let frame = 0, disposed = false;
    const measure = () => {
      const rect = view.getBoundingClientRect(), rootRect = node.getBoundingClientRect();
      const screen = view.querySelector(".lld-camera__copy > .deck-screen");
      if (!screen || !rect.width || !rect.height || view.querySelector(".lld-camera")?.dataset.measured !== "1") return;
      const world = view.querySelector(".lld-camera__world");
      const worldScale = new DOMMatrixReadOnly(getComputedStyle(world).transform).a;
      const targets = anchorTargets.flatMap((stop) => {
        const element = screen.querySelector(stop.target.selector);
        if (!element) return [];
        const bounds = element.getBoundingClientRect();
        const x = Math.max(0, bounds.left - rect.left), y = Math.max(0, bounds.top - rect.top);
        const right = Math.min(rect.width, bounds.right - rect.left), bottom = Math.min(rect.height, bounds.bottom - rect.top);
        return right > x && bottom > y ? [{ id: stop.id, x, y, w: right - x, h: bottom - y }] : [];
      });
      const chosen = anchorTargets.find((stop) => stop.id === state.target);
      const box = chosen && measureAnchor(view, chosen);
      const note = annotation.current?.getBoundingClientRect();
      const ring = isAnchor && box && note ? {
        x: box.x + rect.left - rootRect.left, y: box.y + rect.top - rootRect.top,
        w: Math.min(box.w, rect.width - box.x), h: Math.min(box.h, rect.height - box.y),
        note: { x: note.left + note.width / 2 - rootRect.left, y: note.top - rootRect.top },
        width: rootRect.width, height: rootRect.height
      } : null;
      setGeometry({ targets, ring, scale: worldScale, zoom: worldScale / Math.min(rect.width / screen.offsetWidth, rect.height / screen.offsetHeight), width: rect.width, height: rect.height });
    };
    const tick = () => {
      if (disposed || document.hidden) return;
      const bounds = node.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
      measure();
      if (view.getAnimations({ subtree: true }).some((animation) => animation.playState === "running")) frame = requestAnimationFrame(tick);
    };
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); };
    // Original Camera accepts source-coordinate stops. Derive their rectangles
    // from the live layout, reserving context around the complete selected part.
    const layout = () => {
      const screen = view.querySelector(".lld-camera__copy > .deck-screen");
      if (!screen) return;
      const padding = parseFloat(getComputedStyle(node).getPropertyValue("--spacing-2xl")) || 48;
      const next = anchorTargets.map((stop) => {
        const element = screen.querySelector(stop.target.selector);
        if (!element) return stop;
        let x = 0, y = 0, current = element;
        while (current && current !== screen) { x += current.offsetLeft; y += current.offsetTop; current = current.offsetParent; }
        return { ...stop, rect: { x: x - padding, y: y - padding, w: element.offsetWidth + padding * 2, h: element.offsetHeight + padding * 2 } };
      });
      setMeasuredStops((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      start();
    };
    const resize = new ResizeObserver(layout); resize.observe(view);
    view.querySelectorAll(".bp-input, .bp-panel, .bp-cards").forEach((element) => resize.observe(element));
    const mutations = new MutationObserver(start);
    mutations.observe(view, { subtree: true, attributes: true, attributeFilter: ["style", "data-measured", "data-fix"] });
    const visible = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { measure(); start(); } else cancelAnimationFrame(frame); }); visible.observe(node);
    view.addEventListener("transitionrun", start); view.addEventListener("transitionend", start);
    document.addEventListener("visibilitychange", start);
    layout(); measure(); start();
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); visible.disconnect(); view.removeEventListener("transitionrun", start); view.removeEventListener("transitionend", start); document.removeEventListener("visibilitychange", start); };
  }, [state.target, state.before, state.reduced, state.width, state.height, isAnchor]);
  const ring = geometry.ring;
  const highlighted = geometry.targets.find((target) => target.id === (hover || state.target) && !(isAnchor && target.id === state.target));
  return jsxs("div", { ref: holder, className: "web-art__probe", "data-target": state.target, "data-before": String(state.before),
    onKeyDown: (event) => { if (event.key === "Escape") { event.preventDefault(); reset(); } },
    children: [jsxs("div", { className: "web-art__screen-toolbar", children: [
      jsx("span", { className: "web-art__screen-status", "aria-live": "polite", children: isComparison ? `${state.before ? "Before" : "After"} · tap a part to compare` : isAnchor ? "Tap a part to attach the note" : selected ? `${selected} · ${geometry.zoom?.toFixed(1) ?? "—"}× overview` : "Tap Input, Panel or Cards" }),
      (isComparison || isAnchor) && jsx("button", { type: "button", className: "web-art__reset", "data-screen-action": "state", "aria-label": `Show ${state.before ? "After" : "Before"} state`, onClick: () => act({ before: !state.before }), children: `Show ${state.before ? "After" : "Before"}` }),
      !isComparison && jsx("button", { type: "button", className: "web-art__reset", "data-screen-action": "reset", onClick: reset, disabled: state.target === "whole", children: isAnchor ? "Clear note" : "Whole screen" }),
      state.name === "compare" && jsx("button", { type: "button", className: "web-art__reset", "data-screen-action": "sample", "aria-pressed": Boolean(state.running), onClick: () => report({ type: "sampling", running: !state.running }), children: state.running ? "Stop sample" : "Sample frames" })
    ] }), jsxs("div", { ref: viewport, className: "web-art__viewport", children: [
      jsx("div", { className: "web-art__drawing", inert: true, "aria-hidden": "true", children: jsx(Camera, {
        ...common, fix: state.before ? (isAnchor ? anchorFix : beforeFix) : proposedFix,
        theme: state.theme, active: true, reversible: true, cut: state.cut, stops: measuredStops, at,
        xray: state.xray, className: "web-art__camera"
      }) }),
      jsx("div", { className: "web-art__screen-targets", role: "group",
        onPointerMove: (event) => { const position = `${event.clientX}:${event.clientY}`; if (event.pointerType === "touch" || pointer.current === position) return; pointer.current = position; setHover(event.target.dataset.screenTarget || ""); },
        onPointerLeave: () => { pointer.current = null; setHover(""); }, "aria-label": isComparison ? "Apply the other design state" : isAnchor ? "Choose the element to annotate" : "Choose the element to frame", children: geometry.targets.map((target) => jsx("button", {
        type: "button", className: "web-art__screen-target", "data-screen-target": target.id,
        style: { left: target.x, top: Math.max(0, Math.min(geometry.height - Math.max(state.tapTarget, target.h), target.y - Math.max(0, state.tapTarget - target.h) / 2)), width: target.w, height: Math.max(state.tapTarget, target.h) },
        "aria-label": isComparison ? `${targetNames[target.id]}: show ${state.before ? "After" : "Before"} state` : `${isAnchor ? "Annotate" : "Frame"} ${targetNames[target.id]}`,
        "aria-pressed": !isComparison ? state.target === target.id : undefined,
        onFocus: () => setHover(target.id), onBlur: () => setHover(""),
        onClick: () => activate(target.id)
      }, target.id)) }),
      highlighted && jsx("svg", { className: "web-art__marks web-art__hover", viewBox: `0 0 ${geometry.width} ${geometry.height}`, "aria-hidden": "true", children: jsx("rect", { x: highlighted.x, y: highlighted.y, width: highlighted.w, height: highlighted.h }) })
    ] }),
    isAnchor && jsxs("div", { ref: annotation, className: "web-art__annotation", "aria-live": "polite", children: [jsx("b", { children: selected || "Choose a component" }), jsx("span", { children: selected ? `Raised level · ${state.before ? "Before" : "After"}` : "The note will follow its live bounds." })] }),
    ring && jsxs("svg", { className: "web-art__marks web-art__anchor", viewBox: `0 0 ${ring.width} ${ring.height}`, "aria-hidden": "true", children: [
      jsx("rect", { x: ring.x, y: ring.y, width: Math.max(0, ring.w), height: Math.max(0, ring.h) }),
      jsx("path", { d: `M${ring.x + ring.w / 2},${ring.y + ring.h} L${ring.note.x},${ring.note.y}` }),
      jsx("circle", { cx: ring.x + ring.w / 2, cy: ring.y + ring.h, r: 3 })
    ] }),
    state.name === "compare" && jsx("output", { className: "web-art__sample-reading", "data-screen-reading": "", children: state.running ? sample.frames ? `${sample.frames.avg.toFixed(1)} ms avg · ${sample.frames.worst.toFixed(1)} ms worst · ${sample.doubledNow} text overlaps` : "Collecting frames…" : state.sampleReading || "Frame check ready · start a sample" })
  ] });
}

const TagContext = React.createContext(false);
function TaggedScreen(props) {
  const xray = React.useContext(TagContext);
  return jsx(BlueprintScreen, { ...props, xray });
}
function LayersArtwork({ state, report }) {
  const stage = Number(state.stage) || 0;
  const holder = React.useRef(null);
  const [projection, setProjection] = React.useState(null);
  const [targets, setTargets] = React.useState([]);
  const lastPointer = React.useRef(null);
  const captureProjection = React.useCallback((value) => setProjection(value), []);
  const selected = state.focus ? { layer: state.focus, region: state.region || null } : null;
  const preview = state.hoverFocus ? { layer: state.hoverFocus, region: state.hoverRegion || null } : selected;
  const baseTargets = projection ? projectTargets(projection, layerSubject.components) : [];
  const target = selected && baseTargets.find((item) => item.focus.layer === selected.layer && item.focus.region === selected.region);
  const lift = holder.current ? parseFloat(getComputedStyle(holder.current).getPropertyValue("--lld-hover-lift")) || 0 : 0;
  let zoom = { scale: 1, x: 0, y: 0 };
  if (selected?.region && target) {
    const points = Object.values(target.quad);
    const xs = points.map((point) => point.x), ys = points.map((point) => point.y - lift);
    const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
    const scale = Math.min(1.8, Math.max(1, Math.min(state.width * .65 / width, state.height * .65 / height)));
    zoom = { scale, x: state.width / 2 - (Math.min(...xs) + width / 2) * scale, y: state.height / 2 - (Math.min(...ys) + height / 2) * scale };
  }
  // The source camera is orthographic (no perspective). Compose its exact stack
  // and depth matrices into each plane, so WebKit paints the same coordinates it
  // reports. Nested preserve-3d reported raised DOM bounds but painted flat faces.
  // Original source transforms remain untouched; CSS interpolates the composed
  // target through the same plane timing, delay, lift and opacity primitives.
  React.useLayoutEffect(() => {
    const node = holder.current;
    if (!node) return;
    const originals = new WeakMap();
    const compose = () => {
      const stack = node.querySelector(".lld-stack--levels");
      if (!stack?.style.transform) return;
      const [x, y] = getComputedStyle(stack).transformOrigin.split(" ").map(parseFloat);
      const sourceTransform = stack.style.transform.replace(/translate\(\s*([-\d.]+)%\s*,?\s*([-\d.]+)%\s*\)/g, (_, horizontal, vertical) => `translate(${Number(horizontal) * stack.offsetWidth / 100}px, ${Number(vertical) * stack.offsetHeight / 100}px)`);
      const stackMatrix = new DOMMatrix().translate(x, y).multiply(new DOMMatrix(sourceTransform)).translate(-x, -y);
      const sheets = [...stack.querySelectorAll(":scope > .lld-plane")];
      if (sheets.some((plane) => !plane.style.transform)) return;
      for (const plane of sheets) {
        const matrix = stackMatrix.multiply(new DOMMatrix(plane.style.transform));
        const value = `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map((part) => part.toFixed(6)).join(",")})`;
        originals.set(plane, plane.style.transform);
        if (plane.style.getPropertyValue("--web-plane-transform") !== value) plane.style.setProperty("--web-plane-transform", value);
      }
      originals.set(stack, stack.style.transform);
      stack.dataset.webProjected = "true";
    };
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList" || (record.target.matches?.(".lld-stack--levels, .lld-plane") && originals.get(record.target) !== record.target.style.transform))) compose();
    });
    observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
    const resize = new ResizeObserver(compose); resize.observe(node);
    compose();
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);
  // The source supplies component rectangles and the projection interpolation. Read the
  // rendered corner anchors so hits also follow in-flight lift, zoom and resize exactly.
  React.useLayoutEffect(() => {
    if (!projection || stage < 3 || !holder.current) { setTargets([]); return; }
    const node = holder.current;
    let frame = 0, disposed = false;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      const corners = new Map();
      for (const layer of projection.layers) {
        const quad = {};
        for (const corner of ["tl", "tr", "br", "bl"]) {
          const anchor = node.querySelector(`[data-sheet="${layer}"][data-corner="${corner}"]`);
          if (!anchor) return;
          const rect = anchor.getBoundingClientRect();
          quad[corner] = { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top };
        }
        corners.set(layer, quad);
      }
      setTargets(projectTargets({ ...projection, corners }, layerSubject.components));
    };
    const tick = () => {
      if (disposed || document.hidden) return;
      const visible = node.getBoundingClientRect();
      if (visible.bottom <= 0 || visible.top >= innerHeight) return;
      measure();
      // Animation objects are the lifecycle truth; no permanent measurement loop.
      if (node.getAnimations({ subtree: true }).some((animation) => animation.playState === "running" && "transitionProperty" in animation)) frame = requestAnimationFrame(tick);
    };
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); };
    measure(); start();
    node.addEventListener("transitionrun", start);
    node.addEventListener("transitionend", start);
    const observer = new ResizeObserver(start); observer.observe(node);
    const visibleObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) start(); else cancelAnimationFrame(frame); }); visibleObserver.observe(node);
    document.addEventListener("visibilitychange", start);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); visibleObserver.disconnect(); document.removeEventListener("visibilitychange", start); node.removeEventListener("transitionrun", start); node.removeEventListener("transitionend", start); };
  }, [projection, stage, state.focus, state.region, state.sizeKey, state.reduced]);
  const announce = (focus, pinned = false) => report({ type: "point", focus: focus?.layer || "", region: focus?.region || "", pinned });
  const clear = () => { lastPointer.current = null; announce(null, true); };
  React.useEffect(() => {
    const clearPreview = () => { lastPointer.current = null; announce(null); };
    window.addEventListener("blur", clearPreview);
    document.addEventListener("visibilitychange", clearPreview);
    return () => { window.removeEventListener("blur", clearPreview); document.removeEventListener("visibilitychange", clearPreview); };
  }, [report]);
  React.useEffect(() => { lastPointer.current = null; }, [state.reduced, state.focus, state.region]);
  const pointString = (quad) => [quad.tl, quad.tr, quad.br, quad.bl].map((point) => `${point.x},${point.y}`).join(" ");
  const highlighted = preview && targets.find((item) => item.focus.layer === preview.layer && item.focus.region === preview.region);
  const nameFor = (item) => item.focus.region ? layerSubject.components[item.focus.region].name : layerSubject.levels.find((level) => level.layer === item.focus.layer)?.name;
  return jsx(TagContext.Provider, { value: state.xray, children: jsxs("div", {
    ref: holder, className: "web-art__interaction", "data-selection": selected ? `${selected.layer}:${selected.region || ""}` : "", "data-preview": preview ? `${preview.layer}:${preview.region || ""}` : "",
    onKeyDown: (event) => { if (event.key === "Escape") { event.preventDefault(); clear(); } },
    onPointerLeave: () => { lastPointer.current = null; announce(null); },
    children: [jsx("div", {
      className: "web-art__layer-world", inert: true, "aria-hidden": "true",
      style: { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` },
      children: jsx(LayerStage, {
        ...common, screenComponent: TaggedScreen, fix: layerFix, stackFix: layerFix, planes,
        view: stage === 0 ? Views.FLAT : Views.STACK,
        explode: stage === 1 ? Explode.SWAP : stage === 2 ? Explode.TILT : Explode.FULL,
        active: true, dialog: true, attachScrim: true, diagram: false, tags: false,
        labels: false, verdict: false, annotate: stage >= 4,
        flatScale: state.flatScale, center: { x: 0.5, y: 0.5 },
        focus: selected?.layer || null, blueprint: state.blueprint, theme: state.theme, cut: state.cut, onProjection: captureProjection
      }, state.sizeKey)
    }), stage < 3 && jsx("button", { type: "button", className: "web-art__open", onClick: () => report({ type: "open" }), children: jsx("span", { children: "Open the screen to inspect ↗" }) }), stage >= 3 && jsxs("svg", {
      className: "web-art__hits", viewBox: `0 0 ${state.width} ${state.height}`, role: "group", "aria-label": "Inspect the live screen surfaces",
      onPointerMove: (event) => {
        if (event.pointerType === "touch") return;
        const position = `${event.clientX}:${event.clientY}`;
        if (position === lastPointer.current) return;
        lastPointer.current = position;
        const key = event.target.getAttribute("data-target");
        announce(targets.find((item) => item.key === key)?.focus);
      },
      onClick: (event) => { if (event.target === event.currentTarget) clear(); },
      children: [targets.map((item) => jsx("polygon", {
        className: "web-art__hit", "data-target": item.key, points: pointString(item.quad),
        role: "button", tabIndex: 0, "aria-label": `Inspect ${nameFor(item)}`,
        "aria-pressed": selected?.layer === item.focus.layer && selected?.region === item.focus.region,
        onFocus: () => announce(item.focus), onBlur: () => announce(null),
        onClick: (event) => { event.stopPropagation(); announce(item.focus, true); },
        onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); announce(item.focus, true); } }
      }, item.key)), highlighted && jsx("polygon", { className: "web-art__highlight", "aria-hidden": "true", points: pointString(highlighted.quad) })]
    }), highlighted && jsxs("div", { className: "web-art__inspection", "aria-live": "polite", children: [jsx("span", { children: `${nameFor(highlighted)} · ${selected?.layer === highlighted.focus.layer && selected?.region === highlighted.focus.region ? "selected" : "click to inspect"}` }), selected && jsx("button", { type: "button", className: "web-art__reset", onClick: clear, children: "Back to whole screen" })] })]
  }) });
}

export async function createArtwork(host, initial, report = () => {}) {
  const css = await sourceStyle;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css + boundaryStyle;
  const mount = document.createElement("div");
  mount.style.cssText = "width:100%;height:100%";
  shadow.append(style, mount);
  const root = ReactDOM.createRoot(mount);
  let state = { theme: "light", before: false, target: "whole", stage: 0, focus: "", blueprint: false, xray: false, outlines: false, running: false, reduced: false, cut: 0, ...initial };
  let geometry = {};
  function render() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const scale = Math.min(width / 1400, height / 1100) * 0.7;
    geometry = { width, height, flatScale: Math.min(width / 1440, height / 833) * 0.9, sizeKey: `${Math.round(width)}-${Math.round(height)}-${state.reduced}` };
    const live = { ...state, ...geometry };
    root.render(jsx("div", {
      className: `lld-deck web-art${state.theme === "dark" ? " lld-dark" : ""}`,
      "data-motion": state.reduced || state.instant ? "reduce" : "full",
      "data-theme": state.theme, "data-outlines": state.outlines,
      style: { "--lld-explode-scale": scale, "--lld-duration-camera": state.reduced ? "0ms" : state.transitionDuration, "--lld-flip-move": state.reduced ? "0ms" : state.transitionDuration, "--lld-flip-fade": state.reduced ? "0ms" : state.controlDuration, "--lld-flip-enter": state.reduced ? "0ms" : state.controlDuration, "--lld-flip-colour": state.reduced ? "0ms" : state.controlDuration, ...(state.kind === "layers" && !state.reduced ? { "--lld-duration-tilt": state.transitionDuration, "--lld-duration-rise": state.transitionDuration, "--lld-rise-stagger": state.staggerDuration, "--lld-duration-zoom": state.transitionDuration, "--lld-duration-hover": state.transitionDuration } : {}) },
      children: state.kind === "layers" ? jsx(LayersArtwork, { state: live, report }) : jsx(CameraArtwork, { state: live, report })
    }));
  }
  const observer = new ResizeObserver(render);
  observer.observe(host);
  render();
  return {
    update(patch) {
      const changingDesign = patch.before !== undefined && patch.before !== state.before;
      const screen = mount.querySelector(".lld-camera .bp");
      const pendingDesign = screen && screen.dataset.fix.split(" ").includes("emphasis") !== !state.before;
      const interrupted = changingDesign && (pendingDesign || mount.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"));
      // The source Camera defers its design update. A rapid reverse can otherwise
      // let an older deferred state win. Its original cut path settles both the
      // FLIP controller and the latest component state before accepting new work.
      const cut = patch.cut ?? state.cut;
      state = { ...state, ...patch, cut: (patch.reduced ?? state.reduced) || interrupted ? cut + 1 : cut };
      render();
    },
    destroy() { observer.disconnect(); root.unmount(); },
    get state() { return { ...state, ...geometry }; }
  };
}
