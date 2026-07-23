import { SURFACE_ASCII_RAMP } from "./structural-glyph-field.js";

export const DITHER_DISPERSAL_DURATION = 920;

const TREMOR_ATTACK = 12;
const TREMOR_FADE_START = 0.34;
const TREMOR_FADE_END = 0.82;
const TREMOR_PHASE_X = 0.13;
const TREMOR_PHASE_Y = 0.11;
const TREMOR_FREQUENCY_X = 64;
const TREMOR_FREQUENCY_Y = 58;
const TREMOR_AMPLITUDE = 4.5;
const DESKTOP_TOTAL_GLYPHS = 5200;
const CONSTRAINED_TOTAL_GLYPHS = 1400;
const MOBILE_TOTAL_GLYPHS = 720;
const SAVE_DATA_TOTAL_GLYPHS = 360;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const glyphFields = new WeakMap();

export const setDitherGlyphField = (item, field) => {
  glyphFields.set(item, field);
};

const smoothstep = (edgeStart, edgeEnd, value) => {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

export const sampleDitherTremor = (progress, position) => {
  const t = clamp(progress, 0, 1);
  const envelope =
    Math.min(1, t * TREMOR_ATTACK) *
    (1 - smoothstep(TREMOR_FADE_START, TREMOR_FADE_END, t));
  return {
    x:
      Math.sin(position.y * TREMOR_PHASE_X + t * TREMOR_FREQUENCY_X) *
      TREMOR_AMPLITUDE *
      envelope,
    y:
      Math.cos(position.x * TREMOR_PHASE_Y + t * TREMOR_FREQUENCY_Y) *
      TREMOR_AMPLITUDE *
      envelope
  };
};

const hash = (x, y, seed) => {
  const value =
    Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

const getFalloutGlyph = (sourceGlyph, progress) => {
  if (progress < 0.34) return sourceGlyph;
  const fallout = smoothstep(0.34, 0.94, progress);
  const index = clamp(
    Math.round((1 - fallout) * (SURFACE_ASCII_RAMP.length - 1)),
    1,
    SURFACE_ASCII_RAMP.length - 1
  );
  return SURFACE_ASCII_RAMP[index];
};

export const createDitherPixelDisperser = (root, field) => {
  const canvas = root.querySelector("[data-dither-disperse]");
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;

  let bursts = [];
  let frame = 0;
  let lastDrawTime = 0;
  let surface = { width: 1, height: 1, dpr: 1 };
  const mobileMode = window.matchMedia("(pointer: coarse), (max-width: 820px)");
  const limitedHardware =
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator.deviceMemory || 8) <= 4;
  const saveData = navigator.connection?.saveData === true;
  const constrainedMode = mobileMode.matches || limitedHardware || saveData;

  const resize = () => {
    const width = Math.max(1, field.clientWidth);
    const height = Math.max(1, field.clientHeight);
    const dpr = clamp(window.devicePixelRatio || 1, 1, constrainedMode ? 1 : 1.5);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    surface = { width, height, dpr };
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return surface;
  };

  const buildBurst = (item, origin, seed, startedAt, glyphBudget) => {
    const glyphField = glyphFields.get(item);
    if (!glyphField || !Array.isArray(glyphField.glyphs)) return null;

    const width = item.offsetWidth;
    const height = item.offsetHeight;
    const ageScale =
      Number.parseFloat(item.style.getPropertyValue("--trail-age-scale")) || 1;
    const brightness =
      Number.parseFloat(item.style.getPropertyValue("--trail-age-brightness")) || 1;
    const x =
      Number.parseFloat(item.style.getPropertyValue("--trail-x")) || 0;
    const y =
      Number.parseFloat(item.style.getPropertyValue("--trail-y")) || 0;
    const angle =
      ((Number.parseFloat(item.style.getPropertyValue("--trail-angle")) || 0) *
        Math.PI) /
      180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const candidates = [];

    for (let row = 0; row < glyphField.rows; row += 1) {
      for (let column = 0; column < glyphField.columns; column += 1) {
        const glyph = glyphField.glyphs[row * glyphField.columns + column];
        if (!glyph || glyph === " ") continue;
        const localX = ((column + 0.5) / glyphField.columns) * width;
        const localY = ((row + 0.5) / glyphField.rows) * height;
        const centeredX = localX - width / 2;
        const centeredY = localY - height / 2;
        candidates.push({
          x:
            x +
            width / 2 +
            (centeredX * cos - centeredY * sin) * ageScale,
          y:
            y +
            height / 2 +
            (centeredX * sin + centeredY * cos) * ageScale,
          localX,
          localY,
          glyph
        });
      }
    }

    const count = Math.min(glyphBudget, candidates.length);
    if (!count) return null;
    const step = candidates.length / count;
    const particles = [];

    for (let index = 0; index < count; index += 1) {
      const candidate =
        candidates[
          Math.min(candidates.length - 1, Math.floor(index * step))
        ];
      const jitter =
        (hash(candidate.localX, candidate.localY, seed) - 0.5) * 1.3;
      const baseAngle =
        Math.atan2(candidate.y - origin.y, candidate.x - origin.x) + jitter;
      const velocity =
        0.72 + hash(candidate.localY, candidate.localX, seed + 1) * 0.68;
      particles.push({
        x: candidate.x,
        y: candidate.y,
        dx: Math.cos(baseAngle) * velocity,
        dy: Math.sin(baseAngle) * velocity,
        glyph: candidate.glyph
      });
    }

    const color =
      Number.parseFloat(
        getComputedStyle(root).getPropertyValue(
          "--dither-trail-disperse-invert"
        )
      ) > 0.5
        ? "#f4f2ea"
        : "#080808";

    return {
      particles,
      start: startedAt,
      duration: DITHER_DISPERSAL_DURATION,
      spread: clamp(root.clientWidth * 0.27, 240, 440),
      brightness,
      color,
      size: Math.max(7, glyphField.cellHeight * ageScale)
    };
  };

  const render = (now) => {
    frame = 0;
    const minimumFrameInterval = constrainedMode ? 1000 / 30 : 1000 / 60;
    if (lastDrawTime && now - lastDrawTime < minimumFrameInterval - 1) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastDrawTime = now;
    resize();
    context.clearRect(0, 0, surface.width, surface.height);
    context.textAlign = "center";
    context.textBaseline = "middle";

    const activeBursts = [];
    for (const burst of bursts) {
      const progress = clamp((now - burst.start) / burst.duration, 0, 1);
      if (progress >= 1) continue;

      const ease = 1 - Math.pow(1 - progress, 4.2);
      const shakeEnvelope =
        Math.min(1, progress * TREMOR_ATTACK) *
        (1 - smoothstep(TREMOR_FADE_START, TREMOR_FADE_END, progress));
      const alpha =
        (1 - smoothstep(0.48, 1, progress)) * burst.brightness;
      const size = burst.size * (1 - progress * 0.58);
      context.globalAlpha = alpha;
      context.fillStyle = burst.color;
      context.font = `700 ${size}px "Geist Mono", monospace`;

      for (const particle of burst.particles) {
        const shakeX =
          Math.sin(
            particle.y * TREMOR_PHASE_X + progress * TREMOR_FREQUENCY_X
          ) *
          TREMOR_AMPLITUDE *
          shakeEnvelope;
        const shakeY =
          Math.cos(
            particle.x * TREMOR_PHASE_Y + progress * TREMOR_FREQUENCY_Y
          ) *
          TREMOR_AMPLITUDE *
          shakeEnvelope;
        const x = particle.x + particle.dx * burst.spread * ease + shakeX;
        const y =
          particle.y +
          particle.dy * burst.spread * ease +
          shakeY +
          64 * progress * progress;
        context.fillText(getFalloutGlyph(particle.glyph, progress), x, y);
      }
      activeBursts.push(burst);
    }

    context.globalAlpha = 1;
    bursts = activeBursts;
    if (bursts.length) {
      frame = requestAnimationFrame(render);
    } else {
      context.clearRect(0, 0, surface.width, surface.height);
    }
  };

  const disperse = (items, origin, startedAt = performance.now()) => {
    if (!items.length) return false;
    const totalBudget = saveData
      ? SAVE_DATA_TOTAL_GLYPHS
      : mobileMode.matches
        ? MOBILE_TOTAL_GLYPHS
        : limitedHardware
          ? CONSTRAINED_TOTAL_GLYPHS
          : DESKTOP_TOTAL_GLYPHS;
    const glyphBudget = Math.max(72, Math.floor(totalBudget / items.length));
    const nextBursts = items
      .map((item, index) =>
        buildBurst(item, origin, index + bursts.length, startedAt, glyphBudget)
      )
      .filter(Boolean);
    if (!nextBursts.length) return false;
    bursts.push(...nextBursts);
    if (!frame) {
      render(startedAt + 16);
      if (bursts.length && !frame) frame = requestAnimationFrame(render);
    }
    return true;
  };

  return { disperse };
};
