export const SURFACE_ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];

const SLOW_FIELD_WIDTH = 0.26;
const SLOW_FIELD_DRAG_MS = 145;
const HOVER_DRAG_MS = 230;
const SOURCE_RECOVERY_MS = 420;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createStructuralGlyphField(root, { ramp = SURFACE_ASCII_RAMP } = {}) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cols = 1;
  let rows = 1;
  let mask = new Uint8Array(1);
  let sourceGlyphs = [" "];
  let sourceScores = new Float32Array(1);
  let sourceLift = new Float32Array(1);
  let trail = new Float32Array(1);
  let output = [" "];
  let targetScores = new Float32Array(1);
  let particles = [];
  let hoverPoint = { x: 0, y: 0, heat: 0 };
  let pointerPoint = null;
  let pointerTime = 0;
  let pointerVelocity = { x: 0, y: 0 };
  let pointerExitFrame = 0;
  let sequence = 0;
  let lastUpdateTime = 0;

  const resize = (nextCols, nextRows) => {
    cols = Math.max(1, nextCols);
    rows = Math.max(1, nextRows);
    const length = cols * rows;
    mask = new Uint8Array(length);
    sourceGlyphs = new Array(length).fill(" ");
    sourceScores = new Float32Array(length);
    sourceLift = new Float32Array(length);
    trail = new Float32Array(length);
    output = new Array(length).fill(" ");
    targetScores = new Float32Array(length);
    particles = [];
    pointerPoint = null;
    pointerTime = 0;
    pointerVelocity = { x: 0, y: 0 };
    hoverPoint = { x: 0, y: 0, heat: 0 };
  };

  const setSource = (glyphs, nextMask, scores) => {
    if (glyphs.length !== cols * rows) return;
    sourceGlyphs = glyphs.slice();
    mask.set(nextMask);
    if (scores) sourceScores.set(scores);
  };

  const hasObjectAt = (centerX, centerY, radius = 2) => {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(rows - 1, Math.ceil(centerY + radius));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (mask[y * cols + x]) return true;
      }
    }
    return false;
  };

  const eventToGrid = (event, clampToBounds = true) => {
    const bounds = root.getBoundingClientRect();
    const point = {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * (cols - 1),
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * (rows - 1)
    };
    if (!clampToBounds) return point;
    return {
      x: clamp(point.x, 0, cols - 1),
      y: clamp(point.y, 0, rows - 1)
    };
  };

  const trailRadius = () => Math.max(6, Math.min(18, cols * 0.068));

  const addTrail = (point, strength = 1) => {
    const radius = trailRadius();
    const minX = Math.max(0, Math.floor(point.x - radius));
    const maxX = Math.min(cols - 1, Math.ceil(point.x + radius));
    const minY = Math.max(0, Math.floor(point.y - radius));
    const maxY = Math.min(rows - 1, Math.ceil(point.y + radius));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x - point.x) / radius;
        const dy = ((y - point.y) / radius) * 1.45;
        const distance = Math.hypot(dx, dy);
        if (distance > 1) continue;
        const index = y * cols + x;
        trail[index] = Math.max(trail[index], Math.pow(1 - distance, 1.35) * strength);
      }
    }
  };

  const emit = (point, velocity) => {
    const speed = Math.hypot(velocity.x, velocity.y);
    const intensity = clamp((speed - 0.008) / 0.22, 0, 1);
    if (intensity <= 0.01) return;
    const radius = 2 + intensity * 3.5;
    const candidates = [];
    for (let y = Math.max(0, Math.floor(point.y - radius)); y <= Math.min(rows - 1, Math.ceil(point.y + radius)); y += 1) {
      for (let x = Math.max(0, Math.floor(point.x - radius)); x <= Math.min(cols - 1, Math.ceil(point.x + radius)); x += 1) {
        const index = y * cols + x;
        const glyph = sourceGlyphs[index];
        if (
          mask[index] &&
          glyph !== " " &&
          Math.hypot(x - point.x, (y - point.y) * 1.35) <= radius
        ) {
          candidates.push({ x, y, index, glyph });
        }
      }
    }
    if (!candidates.length) return;

    const count = Math.min(candidates.length, Math.round(4 + intensity * 18));
    const sampleStep = candidates.length / count;
    const frameVelocityX = clamp(velocity.x * 16, -4.5, 4.5);
    const frameVelocityY = clamp(velocity.y * 16, -3.5, 3.5);
    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const candidate = candidates[Math.min(candidates.length - 1, Math.floor(particleIndex * sampleStep))];
      const variance = Math.sin((sequence + particleIndex) * 2.17);
      const velocityScale = 0.48 + intensity * 0.72;
      particles.push({
        x: candidate.x,
        y: candidate.y,
        vx: frameVelocityX * velocityScale - frameVelocityY * variance * 0.08,
        vy: frameVelocityY * velocityScale + frameVelocityX * variance * 0.055,
        spread:
          Math.sign(candidate.y - point.y || variance || 1) *
          (0.35 + Math.abs(variance) * 0.65),
        glyph: candidate.glyph,
        life: 1,
        lifetime: 460 + intensity * 360
      });
      sourceLift[candidate.index] = Math.max(sourceLift[candidate.index], 0.72 + intensity * 0.28);
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
    sequence += count;
  };

  const burst = (point, strength = 1) => {
    if (reducedMotion.matches) return;
    const radius = Math.max(5, Math.min(13, cols * 0.075));
    const candidates = [];
    for (let y = Math.max(0, Math.floor(point.y - radius)); y <= Math.min(rows - 1, Math.ceil(point.y + radius)); y += 1) {
      for (let x = Math.max(0, Math.floor(point.x - radius)); x <= Math.min(cols - 1, Math.ceil(point.x + radius)); x += 1) {
        const index = y * cols + x;
        if (!mask[index] || sourceGlyphs[index] === " ") continue;
        const dx = x - point.x;
        const dy = (y - point.y) * 1.35;
        const distance = Math.hypot(dx, dy);
        if (distance <= radius) candidates.push({ x, y, index, glyph: sourceGlyphs[index], dx, dy, distance });
      }
    }
    if (!candidates.length) return;
    const count = Math.min(candidates.length, Math.round(20 + clamp(strength, 0.5, 1.4) * 28));
    const sampleStep = candidates.length / count;
    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const candidate = candidates[Math.min(candidates.length - 1, Math.floor(particleIndex * sampleStep))];
      const variance = Math.sin((sequence + particleIndex) * 1.91);
      const headingLength = Math.max(0.001, candidate.distance);
      const headingX = candidate.dx / headingLength;
      const headingY = candidate.dy / headingLength;
      const speed = (1.1 + Math.abs(variance) * 1.45) * clamp(strength, 0.5, 1.4);
      particles.push({
        x: candidate.x,
        y: candidate.y,
        vx: headingX * speed,
        vy: headingY * speed,
        spread: Math.sign(candidate.dy || variance || 1) * (0.35 + Math.abs(variance) * 0.65),
        glyph: candidate.glyph,
        life: 1,
        lifetime: 580 + Math.abs(variance) * 320
      });
      sourceLift[candidate.index] = 1;
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
    hoverPoint = { x: point.x, y: point.y, heat: 0.72 };
    addTrail(point, 1);
    sequence += count;
  };

  const accelerateAlongHeading = (movement, velocity) => {
    const speed = Math.hypot(velocity.x, velocity.y);
    const influence = 0.18 + clamp(speed / 0.3, 0, 1) * 0.3;
    const movementLength = Math.hypot(movement.x, movement.y);
    const movementScale = movementLength > 6 ? 6 / movementLength : 1;
    for (const particle of particles) {
      const headingLength = Math.hypot(particle.vx, particle.vy);
      if (headingLength <= 0.001) continue;
      const headingX = particle.vx / headingLength;
      const headingY = particle.vy / headingLength;
      const projected =
        movement.x * movementScale * headingX +
        movement.y * movementScale * headingY;
      if (projected <= 0) continue;
      const freshness = Math.pow(particle.life, 1.7);
      particle.vx += headingX * projected * influence * freshness;
      particle.vy += headingY * projected * influence * freshness;
    }
  };

  const slowFieldStrength = (particle) => {
    const normalizedX = particle.x / Math.max(1, cols - 1);
    if (particle.vx < 0 && normalizedX < SLOW_FIELD_WIDTH) {
      return clamp((SLOW_FIELD_WIDTH - normalizedX) / SLOW_FIELD_WIDTH, 0, 1);
    }
    const rightStart = 1 - SLOW_FIELD_WIDTH;
    if (particle.vx > 0 && normalizedX > rightStart) {
      return clamp((normalizedX - rightStart) / SLOW_FIELD_WIDTH, 0, 1);
    }
    return 0;
  };

  const update = (time = performance.now()) => {
    if (!lastUpdateTime) {
      lastUpdateTime = time;
      return;
    }
    const delta = Math.min(140, Math.max(0, time - lastUpdateTime));
    lastUpdateTime = time;
    const frameScale = delta / (1000 / 60);
    const hoverDrag = Math.exp(-delta / HOVER_DRAG_MS);
    const liftDecay = Math.exp(-delta / SOURCE_RECOVERY_MS);
    const trailDecay = Math.exp(-delta / 980);
    const padding = Math.max(cols, rows) * 0.12;
    const nextParticles = [];

    hoverPoint.heat = hoverPoint.heat * trailDecay > 0.01 ? hoverPoint.heat * trailDecay : 0;
    for (let index = 0; index < trail.length; index += 1) {
      const next = trail[index] * trailDecay;
      trail[index] = next > 0.01 ? next : 0;
      const nextLift = sourceLift[index] * liftDecay;
      sourceLift[index] = nextLift > 0.025 ? nextLift : 0;
    }

    for (const particle of particles) {
      particle.x += particle.vx * frameScale;
      particle.y += particle.vy * frameScale;
      const fieldStrength = slowFieldStrength(particle);
      const fieldDrag =
        fieldStrength > 0
          ? Math.exp((-delta / SLOW_FIELD_DRAG_MS) * Math.pow(fieldStrength, 1.35))
          : 1;
      particle.vx *= hoverDrag * fieldDrag;
      particle.vy *= hoverDrag;
      if (fieldStrength > 0) {
        particle.vy += particle.spread * fieldStrength * 0.035 * frameScale;
      }
      particle.life -= (delta / particle.lifetime) * (1 - fieldStrength * 0.52);
      if (
        particle.life > 0.025 &&
        particle.x > -padding &&
        particle.x < cols - 1 + padding &&
        particle.y > -padding &&
        particle.y < rows - 1 + padding
      ) {
        nextParticles.push(particle);
      }
    }
    particles = nextParticles;
  };

  const compose = (baseGlyphs, scores = sourceScores) => {
    const lifted = baseGlyphs.slice();
    for (let index = 0; index < lifted.length; index += 1) {
      if (sourceLift[index] > 0.16) lifted[index] = " ";
    }

    output.fill(" ");
    targetScores.fill(0);
    const radius = Math.max(10, Math.min(28, cols * 0.14));
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const sourceIndex = y * cols + x;
        const glyph = lifted[sourceIndex];
        if (glyph === " " || !mask[sourceIndex]) continue;
        let targetX = x;
        let targetY = y;
        const effectiveHeat = Math.max(hoverPoint.heat, (trail[sourceIndex] || 0) * 0.86);
        if (effectiveHeat > 0.01) {
          const dx = x - hoverPoint.x;
          const dy = (y - hoverPoint.y) * 1.35;
          const distance = Math.hypot(dx, dy);
          if (distance > 0.001 && distance < radius) {
            const pressure = Math.pow(1 - distance / radius, 1.7) * effectiveHeat * 22;
            const directionX = dx / distance;
            const directionY = (y - hoverPoint.y) / distance;
            for (let step = pressure; step > 0; step -= 0.5) {
              const candidateX = clamp(Math.round(x + directionX * step), 0, cols - 1);
              const candidateY = clamp(Math.round(y + directionY * step), 0, rows - 1);
              if (mask[candidateY * cols + candidateX]) {
                targetX = candidateX;
                targetY = candidateY;
                break;
              }
            }
          }
        }
        const targetIndex = targetY * cols + targetX;
        const score = scores[sourceIndex] || 0.1;
        if (score >= targetScores[targetIndex]) {
          output[targetIndex] = glyph;
          targetScores[targetIndex] = score;
        }
      }
    }

    for (const particle of particles) {
      const x = Math.round(particle.x);
      const y = Math.round(particle.y);
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const index = y * cols + x;
      const velocityLength = Math.hypot(particle.vx, particle.vy);
      if (velocityLength > 0.12 && particle.life > 0.22) {
        const wakeLength = particle.life > 0.58 ? 2 : 1;
        for (let step = 1; step <= wakeLength; step += 1) {
          const wakeX = Math.round(x - (particle.vx / velocityLength) * step);
          const wakeY = Math.round(y - (particle.vy / velocityLength) * step);
          if (wakeX >= 0 && wakeX < cols && wakeY >= 0 && wakeY < rows) {
            output[wakeY * cols + wakeX] = " ";
          }
        }
      }
      const fadeIndex = clamp(Math.round(particle.life * (ramp.length - 1)), 1, ramp.length - 1);
      output[index] = particle.life > 0.36 ? particle.glyph : ramp[fadeIndex];
    }
    return output;
  };

  const skeletonLines = () => {
    const lines = [];
    for (let y = 0; y < rows; y += 1) {
      let line = "";
      for (let x = 0; x < cols; x += 1) line += mask[y * cols + x] ? "-" : " ";
      lines.push(line);
    }
    return lines;
  };

  const stopExit = () => {
    if (!pointerExitFrame) return;
    cancelAnimationFrame(pointerExitFrame);
    pointerExitFrame = 0;
  };

  const onPointerMove = (event) => {
    stopExit();
    const point = eventToGrid(event);
    const now = performance.now();
    const previous = pointerPoint;
    if (previous && pointerTime) {
      const delta = Math.max(1, now - pointerTime);
      pointerVelocity = {
        x: (point.x - previous.x) / delta,
        y: (point.y - previous.y) / delta
      };
    }
    pointerPoint = point;
    pointerTime = now;
    const movement = previous
      ? { x: point.x - previous.x, y: point.y - previous.y }
      : { x: 0, y: 0 };
    if (hasObjectAt(point.x, point.y)) {
      hoverPoint = { x: point.x, y: point.y, heat: 1 };
      addTrail(point);
      emit(point, pointerVelocity);
    } else {
      accelerateAlongHeading(movement, pointerVelocity);
    }
  };

  const onPointerLeave = (event) => {
    if (!pointerPoint) return;
    stopExit();
    hoverPoint.heat = 0;
    if (reducedMotion.matches) {
      particles = [];
      sourceLift.fill(0);
      pointerPoint = null;
      return;
    }

    const start = { ...pointerPoint };
    const exit = eventToGrid(event, false);
    const exitVector = { x: exit.x - start.x, y: exit.y - start.y };
    const exitLength = Math.hypot(exitVector.x, exitVector.y);
    const speed = Math.hypot(pointerVelocity.x, pointerVelocity.y);
    const fallback = {
      x: start.x - (cols - 1) * 0.5,
      y: start.y - (rows - 1) * 0.5
    };
    const fallbackLength = Math.max(0.001, Math.hypot(fallback.x, fallback.y));
    const direction =
      exitLength > 0.01
        ? { x: exitVector.x / exitLength, y: exitVector.y / exitLength }
        : speed > 0.01
          ? { x: pointerVelocity.x / speed, y: pointerVelocity.y / speed }
          : { x: fallback.x / fallbackLength, y: fallback.y / fallbackLength };
    const padding = trailRadius() * 1.25;
    const distances = [];
    if (direction.x > 0.001) distances.push((cols - 1 + padding - start.x) / direction.x);
    if (direction.x < -0.001) distances.push((-padding - start.x) / direction.x);
    if (direction.y > 0.001) distances.push((rows - 1 + padding - start.y) / direction.y);
    if (direction.y < -0.001) distances.push((-padding - start.y) / direction.y);
    const nearest = Math.min(...distances.filter((distance) => distance > 0));
    const distance = Number.isFinite(nearest) ? nearest : Math.max(cols, rows) * 0.5;
    const target = {
      x: start.x + direction.x * distance,
      y: start.y + direction.y * distance
    };
    const startedAt = performance.now();
    let previous = start;
    const continueOutside = (time) => {
      const progress = clamp((time - startedAt) / 240, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const point = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased
      };
      accelerateAlongHeading(
        { x: point.x - previous.x, y: point.y - previous.y },
        pointerVelocity
      );
      previous = point;
      if (progress < 1) {
        pointerExitFrame = requestAnimationFrame(continueOutside);
      } else {
        pointerExitFrame = 0;
        pointerPoint = null;
        pointerTime = 0;
        pointerVelocity = { x: 0, y: 0 };
      }
    };
    pointerExitFrame = requestAnimationFrame(continueOutside);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 || reducedMotion.matches) return;
    const point = eventToGrid(event);
    if (!hasObjectAt(point.x, point.y)) return;
    burst(point);
  };

  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave, { passive: true });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });

  return {
    resize,
    setSource,
    update,
    compose,
    skeletonLines,
    burst,
    destroy() {
      stopExit();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
    }
  };
}
