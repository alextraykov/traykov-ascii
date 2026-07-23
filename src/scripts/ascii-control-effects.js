import { SURFACE_ASCII_RAMP } from "./structural-glyph-field.js";

const CLICK_TARGET_SELECTOR = "button:not([disabled]), [data-ascii-burst]";
const STREAM_TARGET_SELECTOR = "[data-ascii-stream]";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const particles = [];
const streams = new Map();
let canvas;
let context;
let frame = 0;
let previousTime = 0;

const smoothstep = (edgeStart, edgeEnd, value) => {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const ensureCanvas = () => {
  if (canvas?.isConnected && context) return true;
  canvas = document.createElement("canvas");
  canvas.className = "ascii-control-particles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  context = canvas.getContext("2d", { alpha: true });
  return Boolean(context);
};

const resize = () => {
  if (!ensureCanvas()) return;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const getInk = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() ||
  "#080808";

const getGlyph = (progress, sourceGlyph = "✹") => {
  if (progress < 0.22) return sourceGlyph;
  const index = clamp(
    Math.round(
      (1 - smoothstep(0.22, 0.94, progress)) *
        (SURFACE_ASCII_RAMP.length - 1)
    ),
    1,
    SURFACE_ASCII_RAMP.length - 1
  );
  return SURFACE_ASCII_RAMP[index];
};

const addParticle = (particle) => {
  particles.push({
    age: 0,
    color: getInk(),
    ...particle
  });
  if (particles.length > 420) particles.splice(0, particles.length - 420);
};

const emitSplash = (target, event) => {
  if (reducedMotion.matches) return;
  const bounds = target.getBoundingClientRect();
  const hasPointerOrigin =
    Number.isFinite(event.clientX) &&
    Number.isFinite(event.clientY) &&
    (event.clientX !== 0 || event.clientY !== 0);
  const originX = hasPointerOrigin
    ? event.clientX
    : bounds.left + bounds.width / 2;
  const originY = hasPointerOrigin
    ? event.clientY
    : bounds.top + bounds.height / 2;
  const count = target.matches("[data-theme-toggle]") ? 10 : 13;
  const themeAdaptive = target.matches("[data-theme-toggle]");

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.34;
    const speed = 0.8 + Math.random() * 1.55;
    addParticle({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      duration: 460 + Math.random() * 220,
      size: 8 + Math.random() * 3,
      themeAdaptive,
      sourceGlyph:
        SURFACE_ASCII_RAMP[
          SURFACE_ASCII_RAMP.length - 1 - Math.floor(Math.random() * 3)
        ]
    });
  }
  requestDraw();
};

const emitStream = (target) => {
  const bounds = target.getBoundingClientRect();
  if (
    bounds.bottom < 0 ||
    bounds.top > window.innerHeight ||
    bounds.right < 0 ||
    bounds.left > window.innerWidth
  ) {
    return;
  }

  for (let index = 0; index < 3; index += 1) {
    addParticle({
      x: bounds.right - 2 + Math.random() * 4,
      y: bounds.top + bounds.height * (0.24 + Math.random() * 0.52),
      vx: 0.75 + Math.random() * 1.1,
      vy: (Math.random() - 0.58) * 0.72,
      duration: 500 + Math.random() * 230,
      size: 7 + Math.random() * 3,
      sourceGlyph:
        SURFACE_ASCII_RAMP[
          SURFACE_ASCII_RAMP.length - 1 - Math.floor(Math.random() * 4)
        ]
    });
  }
};

const draw = (now) => {
  frame = 0;
  if (!ensureCanvas()) return;
  resize();
  const delta = previousTime ? clamp(now - previousTime, 8, 40) : 16.67;
  previousTime = now;

  for (const [target, stream] of streams) {
    if (!target.isConnected) {
      streams.delete(target);
      continue;
    }
    if (now >= stream.nextEmission) {
      emitStream(target);
      stream.nextEmission = now + 54;
    }
  }

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const nextParticles = [];

  for (const particle of particles) {
    particle.age += delta;
    const progress = clamp(particle.age / particle.duration, 0, 1);
    if (progress >= 1) continue;
    const frameScale = delta / (1000 / 60);
    particle.x += particle.vx * frameScale;
    particle.y += particle.vy * frameScale;
    particle.vx *= Math.exp(-delta / 340);
    particle.vy =
      particle.vy * Math.exp(-delta / 390) + 0.012 * frameScale;

    context.globalAlpha = 1 - smoothstep(0.42, 1, progress);
    context.fillStyle = particle.themeAdaptive ? getInk() : particle.color;
    context.font = `700 ${particle.size * (1 - progress * 0.52)}px "Geist Mono", monospace`;
    context.fillText(
      getGlyph(progress, particle.sourceGlyph),
      particle.x,
      particle.y
    );
    nextParticles.push(particle);
  }

  particles.length = 0;
  particles.push(...nextParticles);
  context.globalAlpha = 1;

  if (particles.length || streams.size) {
    frame = requestAnimationFrame(draw);
  } else {
    previousTime = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
};

const requestDraw = () => {
  if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(draw);
};

if (!window.__asciiControlEffectsInitialized) {
  window.__asciiControlEffectsInitialized = true;

  document.addEventListener("click", (event) => {
    const target = event.target.closest?.(CLICK_TARGET_SELECTOR);
    if (target instanceof HTMLElement) emitSplash(target, event);
  });

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.(STREAM_TARGET_SELECTOR);
    if (!(target instanceof HTMLElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) {
      return;
    }
    streams.set(target, { nextEmission: performance.now() });
    requestDraw();
  });

  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest?.(STREAM_TARGET_SELECTOR);
    if (!(target instanceof HTMLElement)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) {
      return;
    }
    streams.delete(target);
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target.closest?.(STREAM_TARGET_SELECTOR);
    if (!(target instanceof HTMLElement)) return;
    streams.set(target, { nextEmission: performance.now() });
    requestDraw();
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target.closest?.(STREAM_TARGET_SELECTOR);
    if (target instanceof HTMLElement) streams.delete(target);
  });

  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    particles.length = 0;
    streams.clear();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    context?.clearRect(0, 0, window.innerWidth, window.innerHeight);
  });

  window.addEventListener("resize", resize, { passive: true });
}
