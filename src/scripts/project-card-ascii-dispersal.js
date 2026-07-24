import { SURFACE_ASCII_RAMP } from "./structural-glyph-field.js";

const MAX_PARTICLES = 760;
const HOVER_SEED_COUNT = 76;
const BURST_PARTICLE_COUNT = 260;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fract = (value) => value - Math.floor(value);
const noise = (seed) => fract(Math.sin(seed * 12.9898 + 78.233) * 43758.5453);

function tokenMilliseconds(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return fallback;
  if (value.endsWith("ms")) return Number.parseFloat(value);
  if (value.endsWith("s")) return Number.parseFloat(value) * 1000;
  return fallback;
}

export function initializeProjectCardDispersal(canvas) {
  const card = canvas.closest(".project-card");
  const context = canvas.getContext("2d");
  if (!card || !context) return () => {};

  const link = card.querySelector("a[href]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = [];
  const pointer = {
    active: false,
    focused: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    intensity: 0,
    lastTime: 0
  };

  let frame = 0;
  let previousFrameTime = 0;
  let emissionAccumulator = 0;
  let emissionSequence = 0;
  let width = 1;
  let height = 1;
  let cardBounds = {
    left: 0,
    top: 0,
    right: 1,
    bottom: 1,
    width: 1,
    height: 1
  };
  let particleColor = "rgb(8, 8, 8)";
  let fontFamily = "monospace";
  let fontSize = 10;
  let bursting = false;
  let replayingClick = false;
  let navigationTimer = 0;

  const isActive = () =>
    (pointer.active || pointer.focused || bursting) && !reduceMotion.matches;

  const syncStyle = () => {
    const style = getComputedStyle(canvas);
    particleColor = style.color;
    fontFamily = style.getPropertyValue("--mono").trim() || "monospace";
  };

  const resize = () => {
    const canvasRect = canvas.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);

    width = Math.max(1, canvasRect.width);
    height = Math.max(1, canvasRect.height);
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    cardBounds = {
      left: cardRect.left - canvasRect.left,
      top: cardRect.top - canvasRect.top,
      right: cardRect.right - canvasRect.left,
      bottom: cardRect.bottom - canvasRect.top,
      width: cardRect.width,
      height: cardRect.height
    };

    fontSize = clamp(Math.round(cardRect.height / 18), 8, 11);
    syncStyle();
  };

  const edgePoint = (edge, progress) => {
    if (edge === 0) {
      return {
        x: cardBounds.left + progress * cardBounds.width,
        y: cardBounds.top,
        normalX: 0,
        normalY: -1,
        tangentX: 1,
        tangentY: 0
      };
    }

    if (edge === 1) {
      return {
        x: cardBounds.right,
        y: cardBounds.top + progress * cardBounds.height,
        normalX: 1,
        normalY: 0,
        tangentX: 0,
        tangentY: 1
      };
    }

    if (edge === 2) {
      return {
        x: cardBounds.right - progress * cardBounds.width,
        y: cardBounds.bottom,
        normalX: 0,
        normalY: 1,
        tangentX: -1,
        tangentY: 0
      };
    }

    return {
      x: cardBounds.left,
      y: cardBounds.bottom - progress * cardBounds.height,
      normalX: -1,
      normalY: 0,
      tangentX: 0,
      tangentY: -1
    };
  };

  const emitEdgeParticle = (edge, intensity, progress) => {
    const seed = emissionSequence + edge * 103;
    const position = progress ?? noise(seed);
    const point = edgePoint(edge, position);
    const variance = noise(seed + 17) * 2 - 1;
    const outwardSpeed = 0.045 + intensity * 0.12 + noise(seed + 61) * 0.045;
    const tangentSpeed = variance * (0.015 + intensity * 0.05);
    const pointerTangent =
      pointer.vx * point.tangentX + pointer.vy * point.tangentY;

    particles.push({
      x: point.x,
      y: point.y,
      originX: point.x,
      originY: point.y,
      vx:
        point.normalX * outwardSpeed +
        point.tangentX * (tangentSpeed + pointerTangent * 0.2),
      vy:
        point.normalY * outwardSpeed +
        point.tangentY * (tangentSpeed + pointerTangent * 0.2),
      age: 0,
      lifetime: 560 + intensity * 260 + noise(seed + 47) * 180,
      life: 1,
      strength: 0.52 + intensity * 0.38,
      scale: 0.78 + noise(seed + 31) * 0.3,
      glyphIndex:
        5 +
        Math.floor(
          noise(seed + 83) * Math.max(1, SURFACE_ASCII_RAMP.length - 5)
        )
    });

    emissionSequence += 1;
  };

  const seedPerimeter = () => {
    const perimeter = Math.max(1, cardBounds.width * 2 + cardBounds.height * 2);

    for (let index = 0; index < HOVER_SEED_COUNT; index += 1) {
      const distance = (index / HOVER_SEED_COUNT) * perimeter;
      let edge = 0;
      let progress = 0;

      if (distance < cardBounds.width) {
        progress = distance / cardBounds.width;
      } else if (distance < cardBounds.width + cardBounds.height) {
        edge = 1;
        progress = (distance - cardBounds.width) / cardBounds.height;
      } else if (distance < cardBounds.width * 2 + cardBounds.height) {
        edge = 2;
        progress =
          (distance - cardBounds.width - cardBounds.height) / cardBounds.width;
      } else {
        edge = 3;
        progress =
          (distance - cardBounds.width * 2 - cardBounds.height) /
          cardBounds.height;
      }

      emitEdgeParticle(edge, 0.34, progress);
    }
  };

  const emitFromEdges = (delta) => {
    if (!(pointer.active || pointer.focused) || bursting) return;

    pointer.intensity *= Math.exp(-delta / 230);
    pointer.vx *= Math.exp(-delta / 210);
    pointer.vy *= Math.exp(-delta / 210);

    const intensity = clamp(0.34 + pointer.intensity, 0, 1);
    const particlesPerMillisecond = 0.24 + intensity * 0.32;
    emissionAccumulator += delta * particlesPerMillisecond;

    let emitted = 0;
    while (emissionAccumulator >= 1 && emitted < 28) {
      emitEdgeParticle(emissionSequence % 4, intensity);
      emissionAccumulator -= 1;
      emitted += 1;
    }

    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }
  };

  const burstSideways = () => {
    if (reduceMotion.matches) return;

    bursting = true;
    pointer.active = false;
    pointer.focused = false;
    emissionAccumulator = 0;
    particles.length = 0;

    for (let index = 0; index < BURST_PARTICLE_COUNT; index += 1) {
      const seed = emissionSequence + index * 7;
      const edge = index % 4;
      const point = edgePoint(edge, noise(seed));
      const side = point.x < cardBounds.left + cardBounds.width / 2 ? -1 : 1;
      const horizontalForce = 0.48 + noise(seed + 11) * 0.62;
      const verticalSpread = (noise(seed + 23) * 2 - 1) * 0.28;
      const centerPull =
        ((point.y - (cardBounds.top + cardBounds.height / 2)) /
          Math.max(1, cardBounds.height)) *
        0.14;

      particles.push({
        x: point.x,
        y: point.y,
        originX: point.x,
        originY: point.y,
        vx: side * horizontalForce,
        vy: verticalSpread + centerPull,
        age: -noise(seed + 37) * 42,
        lifetime: 390 + noise(seed + 47) * 210,
        life: 1,
        strength: 0.7 + noise(seed + 59) * 0.3,
        scale: 0.86 + noise(seed + 71) * 0.4,
        glyphIndex:
          5 +
          Math.floor(
            noise(seed + 89) * Math.max(1, SURFACE_ASCII_RAMP.length - 5)
          )
      });
    }

    emissionSequence += BURST_PARTICLE_COUNT;
    wake();
  };

  const updateParticles = (delta) => {
    const drag = Math.exp(-delta / (bursting ? 420 : 240));
    let writeIndex = 0;

    for (const particle of particles) {
      particle.age += delta;
      if (particle.age < 0) {
        particles[writeIndex] = particle;
        writeIndex += 1;
        continue;
      }

      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= drag;
      particle.vy *= drag;
      particle.life = 1 - particle.age / particle.lifetime;

      const padding = fontSize * 3;
      if (
        particle.life > 0.02 &&
        particle.x > -padding &&
        particle.x < width + padding &&
        particle.y > -padding &&
        particle.y < height + padding
      ) {
        particles[writeIndex] = particle;
        writeIndex += 1;
      }
    }

    particles.length = writeIndex;
    if (bursting && particles.length === 0) bursting = false;
  };

  const drawParticles = () => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = particleColor;
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (const particle of particles) {
      if (particle.age < 0) continue;

      const distance = Math.hypot(
        particle.x - particle.originX,
        particle.y - particle.originY
      );
      const distanceFade = clamp(1 - distance / (bursting ? 240 : 72), 0, 1);
      const alpha = bursting
        ? clamp(particle.life * 1.8, 0, 1)
        : clamp(particle.life * 1.5, 0, 1) * (0.4 + distanceFade * 0.6);
      const decayProgress = clamp(
        (1 - particle.life) * 0.72 +
          distance / (bursting ? 320 : 110) * 0.58,
        0,
        1
      );
      const glyphIndex = clamp(
        Math.round(particle.glyphIndex * (1 - decayProgress)),
        1,
        particle.glyphIndex
      );

      context.globalAlpha = alpha * particle.strength;
      context.font = `700 ${Math.max(
        7,
        fontSize * particle.scale
      )}px ${fontFamily}`;
      context.fillText(
        SURFACE_ASCII_RAMP[glyphIndex],
        particle.x,
        particle.y
      );
    }

    context.globalAlpha = 1;
  };

  const render = (time) => {
    frame = 0;
    if (!previousFrameTime) previousFrameTime = time;
    const delta = clamp(time - previousFrameTime, 0, 48);
    previousFrameTime = time;

    emitFromEdges(delta);
    updateParticles(delta);
    drawParticles();

    if (isActive() || particles.length > 0) {
      frame = window.requestAnimationFrame(render);
    } else {
      previousFrameTime = 0;
    }
  };

  const wake = () => {
    if (reduceMotion.matches || frame) return;
    previousFrameTime = 0;
    frame = window.requestAnimationFrame(render);
  };

  const activate = () => {
    if (pointer.active || reduceMotion.matches) return;
    pointer.active = true;
    pointer.lastTime = 0;
    pointer.intensity = Math.max(pointer.intensity, 0.24);
    seedPerimeter();
    wake();
  };

  const deactivate = () => {
    pointer.active = false;
    pointer.lastTime = 0;
    emissionAccumulator = 0;
    wake();
  };

  const handlePointerOver = (event) => {
    if (card.contains(event.relatedTarget)) return;
    activate();
  };

  const handlePointerOut = (event) => {
    if (card.contains(event.relatedTarget)) return;
    deactivate();
  };

  const handlePointerMove = (event) => {
    if (reduceMotion.matches || bursting) return;

    const now = performance.now();
    const canvasRect = canvas.getBoundingClientRect();
    const nextX = event.clientX - canvasRect.left;
    const nextY = event.clientY - canvasRect.top;

    if (pointer.lastTime) {
      const delta = Math.max(1, now - pointer.lastTime);
      const nextVx = (nextX - pointer.x) / delta;
      const nextVy = (nextY - pointer.y) / delta;
      pointer.vx = pointer.vx * 0.46 + nextVx * 0.54;
      pointer.vy = pointer.vy * 0.46 + nextVy * 0.54;
      pointer.intensity = clamp(
        pointer.intensity + Math.hypot(nextVx, nextVy) * 0.28,
        0,
        1
      );
    }

    pointer.x = nextX;
    pointer.y = nextY;
    pointer.lastTime = now;
    pointer.active = true;
    wake();
  };

  const handleFocusIn = () => {
    if (pointer.focused || reduceMotion.matches) return;
    pointer.focused = true;
    pointer.intensity = Math.max(pointer.intensity, 0.28);
    seedPerimeter();
    wake();
  };

  const handleFocusOut = (event) => {
    if (card.contains(event.relatedTarget)) return;
    pointer.focused = false;
    emissionAccumulator = 0;
    wake();
  };

  const handleLinkClick = (event) => {
    if (
      replayingClick ||
      reduceMotion.matches ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    event.preventDefault();
    burstSideways();

    window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(() => {
      replayingClick = true;
      link.click();
      replayingClick = false;
    }, tokenMilliseconds("--dur-3", 260));
  };

  const handleReducedMotion = () => {
    if (!reduceMotion.matches) {
      resize();
      return;
    }

    particles.length = 0;
    pointer.active = false;
    pointer.focused = false;
    bursting = false;
    window.clearTimeout(navigationTimer);
    navigationTimer = 0;

    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousFrameTime = 0;
    context.clearRect(0, 0, width, height);
  };

  const resizeObserver = new ResizeObserver(resize);
  const themeObserver = new MutationObserver(syncStyle);

  resizeObserver.observe(card);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  card.addEventListener("pointerover", handlePointerOver);
  card.addEventListener("pointerout", handlePointerOut);
  card.addEventListener("pointermove", handlePointerMove, { passive: true });
  card.addEventListener("focusin", handleFocusIn);
  card.addEventListener("focusout", handleFocusOut);
  link?.addEventListener("click", handleLinkClick);
  reduceMotion.addEventListener("change", handleReducedMotion);

  resize();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.clearTimeout(navigationTimer);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    card.removeEventListener("pointerover", handlePointerOver);
    card.removeEventListener("pointerout", handlePointerOut);
    card.removeEventListener("pointermove", handlePointerMove);
    card.removeEventListener("focusin", handleFocusIn);
    card.removeEventListener("focusout", handleFocusOut);
    link?.removeEventListener("click", handleLinkClick);
    reduceMotion.removeEventListener("change", handleReducedMotion);
  };
}

const cleanups = Array.from(
  document.querySelectorAll("[data-project-card-ascii-dispersal]")
).map(initializeProjectCardDispersal);

window.addEventListener(
  "pagehide",
  () => cleanups.forEach((cleanup) => cleanup()),
  { once: true }
);
