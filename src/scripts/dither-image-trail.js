import {
  createDitherPixelDisperser,
  DITHER_DISPERSAL_DURATION,
  sampleDitherTremor
} from "./dither-pixel-dispersal.js";

const ASCII_RAMP = " .:+*#%@";
const ASCII_CELL_WIDTH = 3;
const ASCII_CELL_HEIGHT = 6;
const INITIAL_RENDER_COUNT = 6;
const MOBILE_INITIAL_RENDER_COUNT = 3;
const MOBILE_RENDER_COUNT = 7;
const MOBILE_VISIBLE_LIMIT = 5;
const MIN_RENDER_EDGE = 320;
const MAX_RENDER_EDGE = 720;
const MOBILE_MAX_RENDER_EDGE = 460;
const TRAIL_PARALLAX_RATE = 0.34;
const COPY_PARALLAX_RATE = 0.16;
const TAP_MOVE_TOLERANCE = 12;
const TAP_BURST_HOLD = 120;
const DRAG_INTENT_THRESHOLD = 7;
const AMBIENT_TRAIL_DELAY = 680;
const AMBIENT_TRAIL_INTERVAL = 620;
const AMBIENT_RESUME_DELAY = 1400;
const MOBILE_EMIT_INTERVAL = 84;
const GYRO_TILT_RANGE = 35;
const GYRO_NOISE_FLOOR = 1.5;
const GYRO_SMOOTHING = 0.18;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const loadSource = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    image.onload = null;
    image.onerror = null;
    resolve(image);
  };
  image.onerror = (error) => {
    image.onload = null;
    image.onerror = null;
    reject(error);
  };
  image.src = url;
});

const getRenderLongEdge = (item, sourceWidth, sourceHeight, mobileMode) => {
  const cssWidth = item.offsetWidth || 180;
  const cssHeight = cssWidth * (sourceHeight / sourceWidth);
  const cssLongEdge = Math.max(cssWidth, Math.min(cssHeight, window.innerHeight * 0.64, 560));
  const dpr = clamp(window.devicePixelRatio || 1, 1, mobileMode ? 1.5 : 2);
  return clamp(
    Math.round(cssLongEdge * dpr),
    MIN_RENDER_EDGE,
    mobileMode ? MOBILE_MAX_RENDER_EDGE : MAX_RENDER_EDGE
  );
};

const renderAscii = async (item, tones, mobileMode) => {
  const sourceUrl = item.dataset.ditherSourceUrl;
  const canvas = item.querySelector("[data-dither-canvas]");
  if (!sourceUrl || !(canvas instanceof HTMLCanvasElement)) return false;

  let image;
  try {
    image = await loadSource(sourceUrl);
  } catch {
    return false;
  }

  const sourceWidth = image.naturalWidth || 640;
  const sourceHeight = image.naturalHeight || 480;
  const longEdge = Math.min(
    getRenderLongEdge(item, sourceWidth, sourceHeight, mobileMode),
    Math.max(sourceWidth, sourceHeight)
  );
  const scale = longEdge / Math.max(sourceWidth, sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const columns = Math.max(18, Math.round(width / ASCII_CELL_WIDTH));
  const rows = Math.max(14, Math.round(height / ASCII_CELL_HEIGHT));
  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
  const context = canvas.getContext("2d", { alpha: true });
  if (!sampleContext || !context) return false;

  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  sampleContext.drawImage(image, 0, 0, columns, rows);
  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;

  canvas.width = columns * ASCII_CELL_WIDTH;
  canvas.height = rows * ASCII_CELL_HEIGHT;
  item.style.aspectRatio = `${sourceWidth} / ${sourceHeight}`;
  canvas.style.aspectRatio = `${sourceWidth} / ${sourceHeight}`;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = tones.dark;
  context.font = `700 ${ASCII_CELL_HEIGHT}px "Geist Mono", monospace`;
  context.textBaseline = "top";

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const offset = (y * columns + x) * 4;
      const luma = (
        pixels[offset] * 0.2126 +
        pixels[offset + 1] * 0.7152 +
        pixels[offset + 2] * 0.0722
      ) / 255;
      const contrasted = clamp((luma - 0.5) * 1.08 + 0.5, 0, 1);
      const density = Math.pow(1 - contrasted, 0.94);
      const rampIndex = clamp(
        Math.round(density * (ASCII_RAMP.length - 1)),
        0,
        ASCII_RAMP.length - 1
      );
      const glyph = ASCII_RAMP[rampIndex];
      if (glyph === " ") continue;

      context.globalAlpha = 0.76 + density * 0.24;
      context.fillText(glyph, x * ASCII_CELL_WIDTH, y * ASCII_CELL_HEIGHT);
    }
  }

  context.globalAlpha = 1;

  item.classList.add("is-ascii-rendered");
  return true;
};

const initializeTrail = (root) => {
  if (!(root instanceof HTMLElement) || root.dataset.ditherTrailReady === "true") return;

  const field = root.querySelector("[data-dither-trail-field]");
  const items = Array.from(root.querySelectorAll("[data-dither-trail-item]"));
  const promptItems = items.filter((item) => item.hasAttribute("data-dither-prompt"));
  const tapBurst = root.querySelector("[data-dither-tap-burst]");
  const gyroToggle = root.querySelector("[data-dither-gyro-toggle]");
  const gyroLabel = root.querySelector("[data-dither-gyro-label]");
  if (!(field instanceof HTMLElement) || items.length === 0) return;

  root.dataset.ditherTrailReady = "true";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const mobileViewport = window.matchMedia("(max-width: 820px)");
  let pixelDisperser = null;
  let pixelDisperserInitialized = false;
  let itemIndex = 0;
  let stackIndex = 0;
  let previous = null;
  let current = null;
  let frame = 0;
  let active = false;
  let pointerInside = false;
  let lastPointerAt = 0;
  let lastFrameAt = 0;
  let lastEmitAt = 0;
  let velocity = { x: 0, y: 0 };
  let parallaxFrame = 0;
  let headlineTremorFrame = 0;
  let tapBurstTimer = 0;
  let dragPointerId = null;
  let dragStart = null;
  let dragIntent = null;
  let dragging = false;
  let gyroEnabled = false;
  let gyroFrame = 0;
  let gyroProbeTimer = 0;
  let gyroBaseline = null;
  let gyroTarget = null;
  let fieldBounds = null;
  let fieldSize = { width: 0, height: 0 };
  let initialRenderingStarted = false;
  let deferredRenderingStarted = false;
  let ambientTimer = 0;
  let ambientStartedAt = 0;
  let ambientPausedUntil = 0;
  let ambientPrevious = null;
  let visibleOrder = [];
  let promptsDismissed = false;
  const itemTimers = new WeakMap();
  const itemDimensions = new WeakMap();
  const renderPromises = new WeakMap();
  const hero = root.closest(".about-hero--trail");
  const headline = hero?.querySelector(".about-title--trail");
  const isMobileMode = () => coarsePointer.matches || mobileViewport.matches;

  const getTones = () => {
    const styles = getComputedStyle(root);
    return {
      dark: styles.getPropertyValue("--dither-trail-dark").trim() || "#080808",
      light: styles.getPropertyValue("--dither-trail-light").trim() || "#f0efe6"
    };
  };

  const ensureRendered = (item) => {
    if (item.classList.contains("is-ascii-rendered")) return Promise.resolve(true);
    const existing = renderPromises.get(item);
    if (existing) return existing;

    const pending = renderAscii(item, getTones(), isMobileMode()).then((rendered) => {
      if (rendered) {
        itemDimensions.set(item, {
          width: item.offsetWidth,
          height: item.offsetHeight
        });
      }
      renderPromises.delete(item);
      return rendered;
    });
    renderPromises.set(item, pending);
    return pending;
  };

  const scheduleIdle = (callback) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 320 });
      return;
    }
    window.setTimeout(callback, 32);
  };

  const startDeferredRendering = () => {
    if (deferredRenderingStarted) return;
    deferredRenderingStarted = true;
    const renderLimit = isMobileMode() ? MOBILE_RENDER_COUNT : items.length;
    const initialCount = isMobileMode() ? MOBILE_INITIAL_RENDER_COUNT : INITIAL_RENDER_COUNT;
    const queue = items.slice(Math.min(initialCount, renderLimit), renderLimit);

    const renderNext = () => {
      const item = queue.shift();
      if (!item) return;
      void ensureRendered(item).finally(() => {
        if (queue.length > 0) scheduleIdle(renderNext);
      });
    };

    scheduleIdle(renderNext);
    scheduleIdle(renderNext);
  };

  const startInitialRendering = () => {
    if (initialRenderingStarted) return;
    initialRenderingStarted = true;
    const initialCount = Math.min(
      isMobileMode() ? MOBILE_INITIAL_RENDER_COUNT : INITIAL_RENDER_COUNT,
      isMobileMode() ? MOBILE_RENDER_COUNT : items.length
    );
    void Promise.all(items.slice(0, initialCount).map(ensureRendered)).then(() => {
      if (!promptsDismissed && finePointer.matches && !reducedMotion.matches) {
        promptItems.forEach((item) => item.classList.add("is-prompt"));
      }
      if (isMobileMode()) startDeferredRendering();
      scheduleAmbientTrail(AMBIENT_TRAIL_DELAY);
      if (!active || !current || reducedMotion.matches) return;
      previous = null;
      requestTick();
    });
  };

  const dismissPrompts = () => {
    if (promptsDismissed) return;
    promptsDismissed = true;
    promptItems.forEach((item) => item.classList.remove("is-prompt"));
  };

  const prepareInteraction = () => {
    dismissPrompts();
    ambientPausedUntil = performance.now() + AMBIENT_RESUME_DELAY;
    startDeferredRendering();
    if (pixelDisperserInitialized) return;
    pixelDisperserInitialized = true;
    pixelDisperser = createDitherPixelDisperser(root, field);
  };

  const stopHeadlineTremor = () => {
    window.cancelAnimationFrame(headlineTremorFrame);
    headlineTremorFrame = 0;
    if (!(headline instanceof HTMLElement)) return;
    headline.classList.remove("is-explosion-tremoring");
    headline.style.removeProperty("--headline-tremor-x");
    headline.style.removeProperty("--headline-tremor-y");
  };

  const tremorHeadline = (origin, startedAt) => {
    if (!(headline instanceof HTMLElement)) return;
    stopHeadlineTremor();
    headline.classList.add("is-explosion-tremoring");

    const renderTremor = (now) => {
      headlineTremorFrame = 0;
      const progress = clamp((now - startedAt) / DITHER_DISPERSAL_DURATION, 0, 1);
      const tremor = sampleDitherTremor(progress, origin);
      headline.style.setProperty("--headline-tremor-x", `${tremor.x.toFixed(3)}px`);
      headline.style.setProperty("--headline-tremor-y", `${tremor.y.toFixed(3)}px`);

      if (progress < 1) {
        headlineTremorFrame = window.requestAnimationFrame(renderTremor);
      } else {
        stopHeadlineTremor();
      }
    };

    renderTremor(startedAt + 16);
  };

  const showTapBurst = (origin) => {
    if (!(tapBurst instanceof HTMLElement)) return;
    window.clearTimeout(tapBurstTimer);
    tapBurst.style.setProperty("--tap-burst-x", `${origin.x}px`);
    tapBurst.style.setProperty("--tap-burst-y", `${origin.y}px`);
    tapBurst.classList.remove("is-active", "is-fading");
    void tapBurst.offsetWidth;
    tapBurst.classList.add("is-active");
    tapBurstTimer = window.setTimeout(() => tapBurst.classList.add("is-fading"), TAP_BURST_HOLD);
  };

  if (tapBurst instanceof HTMLElement) {
    tapBurst.addEventListener("transitionend", (event) => {
      if (event.propertyName === "opacity" && tapBurst.classList.contains("is-fading")) {
        tapBurst.classList.remove("is-active", "is-fading");
      }
    });
  }

  const getOrientationAngle = () => {
    const angle = window.screen?.orientation?.angle;
    if (Number.isFinite(angle)) return angle;
    return Number.isFinite(window.orientation) ? window.orientation : 0;
  };

  const syncGyro = (now) => {
    gyroFrame = 0;
    if (!gyroEnabled || dragging || !gyroTarget || reducedMotion.matches) return;

    const prior = current || { x: fieldSize.width / 2, y: fieldSize.height / 2 };
    const next = {
      x: prior.x + (gyroTarget.x - prior.x) * GYRO_SMOOTHING,
      y: prior.y + (gyroTarget.y - prior.y) * GYRO_SMOOTHING
    };
    if (getDistance(prior, next) < GYRO_NOISE_FLOOR) return;

    const delta = clamp(now - lastPointerAt, 8, 48);
    velocity = {
      x: (next.x - prior.x) / delta,
      y: (next.y - prior.y) / delta
    };
    current = next;
    active = true;
    pointerInside = true;
    lastPointerAt = now;
    requestTick();
  };

  const onDeviceOrientation = (event) => {
    if (!gyroEnabled || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    window.clearTimeout(gyroProbeTimer);
    gyroProbeTimer = 0;
    const angle = getOrientationAngle();
    if (!gyroBaseline || gyroBaseline.angle !== angle) {
      gyroBaseline = { beta: event.beta, gamma: event.gamma, angle };
      gyroTarget = { x: fieldSize.width / 2, y: fieldSize.height / 2 };
      return;
    }

    let tiltX = event.gamma - gyroBaseline.gamma;
    let tiltY = event.beta - gyroBaseline.beta;
    if (angle === 90 || angle === -270) {
      [tiltX, tiltY] = [-tiltY, tiltX];
    } else if (angle === 270 || angle === -90) {
      [tiltX, tiltY] = [tiltY, -tiltX];
    } else if (Math.abs(angle) === 180) {
      tiltX *= -1;
      tiltY *= -1;
    }

    gyroTarget = {
      x: clamp(fieldSize.width / 2 + (clamp(tiltX, -GYRO_TILT_RANGE, GYRO_TILT_RANGE) / GYRO_TILT_RANGE) * fieldSize.width * 0.44, 0, fieldSize.width),
      y: clamp(fieldSize.height / 2 + (clamp(tiltY, -GYRO_TILT_RANGE, GYRO_TILT_RANGE) / GYRO_TILT_RANGE) * fieldSize.height * 0.44, 0, fieldSize.height)
    };
    if (!gyroFrame) gyroFrame = window.requestAnimationFrame(syncGyro);
  };

  const disableGyro = () => {
    gyroEnabled = false;
    gyroBaseline = null;
    gyroTarget = null;
    pointerInside = false;
    window.cancelAnimationFrame(gyroFrame);
    window.clearTimeout(gyroProbeTimer);
    gyroFrame = 0;
    gyroProbeTimer = 0;
    window.removeEventListener("deviceorientation", onDeviceOrientation);
    if (gyroToggle instanceof HTMLButtonElement) {
      gyroToggle.setAttribute("aria-pressed", "false");
      gyroToggle.setAttribute("aria-label", "Enable tilt-controlled image trail");
    }
    if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt trail";
    requestTick();
    scheduleAmbientTrail(AMBIENT_RESUME_DELAY);
  };

  const enableGyro = () => {
    if (gyroEnabled || reducedMotion.matches) return;
    prepareInteraction();
    gyroEnabled = true;
    gyroBaseline = null;
    gyroTarget = { x: fieldSize.width / 2, y: fieldSize.height / 2 };
    current = { ...gyroTarget };
    previous = null;
    velocity = { x: 0, y: 0 };
    active = true;
    pointerInside = true;
    lastPointerAt = performance.now();
    if (gyroToggle instanceof HTMLButtonElement) {
      gyroToggle.setAttribute("aria-pressed", "true");
      gyroToggle.setAttribute("aria-label", "Disable tilt-controlled image trail");
    }
    if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt on";
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
    gyroProbeTimer = window.setTimeout(() => {
      if (!gyroBaseline) disableGyro();
    }, 1600);
    requestTick();
  };

  const toggleGyro = async (event) => {
    event.stopPropagation();
    if (!(gyroToggle instanceof HTMLButtonElement)) return;
    if (gyroEnabled) {
      disableGyro();
      return;
    }

    const OrientationEvent = window.DeviceOrientationEvent;
    if (typeof OrientationEvent === "undefined") return;
    try {
      if (typeof OrientationEvent.requestPermission === "function") {
        const permission = await OrientationEvent.requestPermission();
        if (permission !== "granted") {
          if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt blocked";
          return;
        }
      }
      enableGyro();
    } catch {
      if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt unavailable";
    }
  };

  const syncBounds = () => {
    fieldBounds = field.getBoundingClientRect();
    fieldSize = {
      width: field.clientWidth,
      height: field.clientHeight
    };
  };

  const syncParallax = () => {
    parallaxFrame = 0;
    if (!(hero instanceof HTMLElement) || reducedMotion.matches) {
      root.style.removeProperty("--trail-parallax-y");
      hero?.style.removeProperty("--about-hero-parallax-y");
      syncBounds();
      return;
    }

    const offset = clamp(window.scrollY, 0, hero.offsetHeight);
    root.style.setProperty("--trail-parallax-y", `${(offset * TRAIL_PARALLAX_RATE).toFixed(2)}px`);
    hero.style.setProperty("--about-hero-parallax-y", `${(offset * COPY_PARALLAX_RATE).toFixed(2)}px`);
    syncBounds();
  };

  const requestParallax = () => {
    if (!parallaxFrame) parallaxFrame = window.requestAnimationFrame(syncParallax);
  };

  const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const syncAgeScale = () => {
    visibleOrder = visibleOrder.filter((item) => item.classList.contains("is-visible"));
    const newestIndex = visibleOrder.length - 1;

    visibleOrder.forEach((item, index) => {
      const age = newestIndex - index;
      const brightness = clamp(0.84 ** age, 0.4, 1);
      const scale = clamp(0.94 ** age, 0.72, 1);
      item.style.setProperty("--trail-age-brightness", brightness.toFixed(3));
      item.style.setProperty("--trail-age-scale", scale.toFixed(3));
    });
  };

  const hideItem = (item) => {
    const timers = itemTimers.get(item) || [];
    timers.forEach((timer) => window.clearTimeout(timer));
    item.classList.add("is-resetting");
    item.classList.remove("is-visible", "is-exiting", "is-dispersing", "is-pixel-dispersing");
    visibleOrder = visibleOrder.filter((visibleItem) => visibleItem !== item);
    window.requestAnimationFrame(() => item.classList.remove("is-resetting"));
  };

  const showItem = (point, vector) => {
    const availableItems = items.filter((item) => item.classList.contains("is-ascii-rendered"));
    if (availableItems.length === 0) return;

    const item = availableItems[itemIndex % availableItems.length];
    itemIndex += 1;
    stackIndex += 1;
    const existingTimers = itemTimers.get(item) || [];
    existingTimers.forEach((timer) => window.clearTimeout(timer));

    const dimensions = itemDimensions.get(item);
    const width = dimensions?.width || item.offsetWidth;
    const height = dimensions?.height || item.offsetHeight;
    const angle = clamp(vector.x * 0.028, -5, 5);
    const x = point.x - width / 2;
    const y = point.y - height / 2;
    item.style.zIndex = String(stackIndex);
    item.style.setProperty("--trail-x", `${x}px`);
    item.style.setProperty("--trail-y", `${y}px`);
    item.style.setProperty("--trail-rise-y", `${y - 34}px`);
    item.style.setProperty("--trail-angle", `${angle}deg`);
    item.style.setProperty("--trail-exit-angle", `${angle * 0.55}deg`);
    item.classList.remove("is-visible", "is-exiting", "is-dispersing", "is-pixel-dispersing", "is-resetting");
    item.classList.add("is-visible");
    visibleOrder = visibleOrder.filter((visibleItem) => visibleItem !== item);
    visibleOrder.push(item);
    const visibleLimit = isMobileMode() ? MOBILE_VISIBLE_LIMIT : items.length;
    while (visibleOrder.length > visibleLimit) hideItem(visibleOrder[0]);
    syncAgeScale();

    const exitTimer = window.setTimeout(() => item.classList.add("is-exiting"), 1150);
    const resetTimer = window.setTimeout(() => {
      item.classList.add("is-resetting");
      item.classList.remove("is-visible", "is-exiting");
      syncAgeScale();
      window.requestAnimationFrame(() => item.classList.remove("is-resetting"));
    }, 1950);
    itemTimers.set(item, [exitTimer, resetTimer]);
  };

  const ambientTrailStep = () => {
    ambientTimer = 0;
    const now = performance.now();
    const bounds = hero?.getBoundingClientRect() || root.getBoundingClientRect();
    const heroVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    const canRun =
      isMobileMode() &&
      !reducedMotion.matches &&
      !dragging &&
      !gyroEnabled &&
      document.visibilityState === "visible" &&
      heroVisible &&
      now >= ambientPausedUntil;

    if (canRun) {
      if (!ambientStartedAt) ambientStartedAt = now;
      const phase = (now - ambientStartedAt) / 1000;
      const point = {
        x: fieldSize.width * (0.5 + Math.sin(phase * 1.12) * 0.34),
        y: fieldSize.height * (0.54 + Math.sin(phase * 0.73 + 1.2) * 0.28)
      };
      const vector = ambientPrevious
        ? { x: point.x - ambientPrevious.x, y: point.y - ambientPrevious.y }
        : { x: 0, y: 0 };
      showItem(point, vector);
      ambientPrevious = point;
    }

    scheduleAmbientTrail(AMBIENT_TRAIL_INTERVAL);
  };

  function scheduleAmbientTrail(delay = AMBIENT_TRAIL_INTERVAL) {
    if (ambientTimer || reducedMotion.matches || !isMobileMode()) return;
    ambientTimer = window.setTimeout(ambientTrailStep, delay);
  }

  const emitTrail = () => {
    if (!active || !current || reducedMotion.matches) return;

    const now = performance.now();
    if (isMobileMode() && lastEmitAt && now - lastEmitAt < MOBILE_EMIT_INTERVAL) return;

    if (!previous) {
      previous = { ...current };
      showItem(current, { x: 0, y: 0 });
      lastEmitAt = now;
      return;
    }

    const distance = getDistance(previous, current);
    const spacing = isMobileMode()
      ? clamp(fieldSize.width * 0.18, 108, 148)
      : clamp(fieldSize.width * 0.072, 82, 116);
    if (distance < spacing) return;

    const steps = Math.min(isMobileMode() ? 1 : 4, Math.floor(distance / spacing));
    const vector = { x: current.x - previous.x, y: current.y - previous.y };

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      showItem({
        x: previous.x + vector.x * progress,
        y: previous.y + vector.y * progress
      }, vector);
    }

    previous = { ...current };
    lastEmitAt = now;
  };

  const tick = (now) => {
    frame = 0;
    if (!active || !current || reducedMotion.matches) {
      lastFrameAt = 0;
      return;
    }

    const delta = lastFrameAt ? clamp(now - lastFrameAt, 8, 34) : 16.67;
    lastFrameAt = now;
    const idleTime = now - lastPointerAt;

    if (idleTime > 42) {
      const decay = Math.pow(0.9, delta / 16.67);
      velocity.x *= decay;
      velocity.y *= decay;

      const nextX = clamp(current.x + velocity.x * delta, 0, fieldSize.width);
      const nextY = clamp(current.y + velocity.y * delta, 0, fieldSize.height);
      if (nextX === 0 || nextX === fieldSize.width) velocity.x *= 0.2;
      if (nextY === 0 || nextY === fieldSize.height) velocity.y *= 0.2;
      current = { x: nextX, y: nextY };
    }

    emitTrail();

    const speed = Math.hypot(velocity.x, velocity.y);
    const keepMoving = idleTime <= 42 || (idleTime < 460 && speed > 0.035);
    if (keepMoving) {
      frame = window.requestAnimationFrame(tick);
      return;
    }

    velocity = { x: 0, y: 0 };
    lastFrameAt = 0;
    lastEmitAt = 0;
    if (!pointerInside) {
      active = false;
      current = null;
      previous = null;
    }
  };

  const requestTick = () => {
    if (!frame) frame = window.requestAnimationFrame(tick);
  };

  const onPageTransition = (event) => {
    if (!event.detail?.active) return;
    pointerInside = false;
    active = false;
    current = null;
    previous = null;
    velocity = { x: 0, y: 0 };
    lastFrameAt = 0;
    window.cancelAnimationFrame(frame);
    frame = 0;
    stopHeadlineTremor();
    disableGyro();
    dragging = false;
    dragPointerId = null;
    dragStart = null;
    dragIntent = null;
    root.classList.remove("is-dragging");
    window.clearTimeout(ambientTimer);
    ambientTimer = 0;
    window.clearTimeout(tapBurstTimer);
    tapBurst?.classList.remove("is-active", "is-fading");
  };

  const disperseAll = (event) => {
    if (reducedMotion.matches) return;

    prepareInteraction();
    const bounds = fieldBounds || field.getBoundingClientRect();
    const origin = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
    const visibleItems = items.filter((item) => item.classList.contains("is-visible"));
    const startedAt = performance.now();
    const usesPixelShader = pixelDisperser?.disperse(visibleItems, origin, startedAt) || false;
    if (visibleItems.length > 0) tremorHeadline(origin, startedAt);

    visibleItems.forEach((item, index) => {
      const existingTimers = itemTimers.get(item) || [];
      existingTimers.forEach((timer) => window.clearTimeout(timer));

      const x = Number.parseFloat(item.style.getPropertyValue("--trail-x")) || 0;
      const y = Number.parseFloat(item.style.getPropertyValue("--trail-y")) || 0;
      const dimensions = itemDimensions.get(item);
      const width = dimensions?.width || item.offsetWidth;
      const height = dimensions?.height || item.offsetHeight;
      const center = {
        x: x + width / 2,
        y: y + height / 2
      };
      let dx = center.x - origin.x;
      let dy = center.y - origin.y;
      let length = Math.hypot(dx, dy);

      if (length < 12) {
        const fallbackAngle = ((index / Math.max(1, visibleItems.length)) * Math.PI * 2) - Math.PI / 2;
        dx = Math.cos(fallbackAngle);
        dy = Math.sin(fallbackAngle);
        length = 1;
      }

      const distance = clamp(fieldSize.width * 0.28, 220, 420);
      const targetX = x + (dx / length) * distance;
      const targetY = y + (dy / length) * distance;
      const angle = clamp((dx / length) * 16, -16, 16);

      item.style.setProperty("--trail-disperse-x", `${targetX}px`);
      item.style.setProperty("--trail-disperse-y", `${targetY}px`);
      item.style.setProperty("--trail-disperse-angle", `${angle}deg`);
      item.classList.remove("is-exiting");
      item.classList.add(usesPixelShader ? "is-pixel-dispersing" : "is-dispersing");

      const resetTimer = window.setTimeout(() => {
        item.classList.remove("is-visible", "is-dispersing", "is-pixel-dispersing");
      }, usesPixelShader ? 1320 : 540);
      itemTimers.set(item, [resetTimer]);
    });

    previous = { ...origin };
    current = { ...origin };
    velocity = { x: 0, y: 0 };
    lastPointerAt = performance.now();
  };

  const updatePointerPosition = (point, now) => {
    if (!pointerInside || !current || now - lastPointerAt > 140) {
      velocity = { x: 0, y: 0 };
      previous = null;
    } else {
      const delta = clamp(now - lastPointerAt, 8, 48);
      const nextVelocity = {
        x: (point.x - current.x) / delta,
        y: (point.y - current.y) / delta
      };
      velocity = {
        x: velocity.x * 0.58 + nextVelocity.x * 0.42,
        y: velocity.y * 0.58 + nextVelocity.y * 0.42
      };
    }

    pointerInside = true;
    active = true;
    current = point;
    lastPointerAt = now;
    requestTick();
  };

  const isInteractionTarget = (target) => {
    const surface = hero instanceof HTMLElement ? hero : root;
    return target instanceof Node && surface.contains(target);
  };

  document.addEventListener("pointerdown", (event) => {
    if (
      reducedMotion.matches ||
      !event.isPrimary ||
      event.button !== 0 ||
      !isInteractionTarget(event.target) ||
      (gyroToggle instanceof HTMLElement && gyroToggle.contains(event.target))
    ) return;

    const bounds = fieldBounds || field.getBoundingClientRect();
    const isInside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;

    if (!isInside) return;

    dragging = true;
    dragPointerId = event.pointerId;
    dragStart = { x: event.clientX, y: event.clientY };
    dragIntent = event.pointerType === "mouse" ? "trail" : null;
    root.classList.add("is-dragging");
    prepareInteraction();
    updatePointerPosition({
      x: clamp(event.clientX - bounds.left, 0, fieldSize.width),
      y: clamp(event.clientY - bounds.top, 0, fieldSize.height)
    }, performance.now());
    if (event.pointerType !== "mouse" || coarsePointer.matches) emitTrail();
  }, { passive: true });

  document.addEventListener("pointermove", (event) => {
    if (!finePointer.matches && (!dragging || event.pointerId !== dragPointerId)) return;
    if (dragging && event.pointerId !== dragPointerId) return;

    if (dragging && dragStart && event.pointerType !== "mouse" && !dragIntent) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      if (Math.hypot(deltaX, deltaY) < DRAG_INTENT_THRESHOLD) return;
      dragIntent = Math.abs(deltaX) >= Math.abs(deltaY) * 0.86 ? "trail" : "scroll";
      root.classList.toggle("is-dragging", dragIntent === "trail");
    }

    if (dragIntent === "scroll") return;
    if (dragging && event.cancelable && event.pointerType !== "mouse") event.preventDefault();

    const bounds = fieldBounds || field.getBoundingClientRect();
    const isInside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;

    if (!isInside && !dragging) {
      pointerInside = false;
      requestTick();
      return;
    }

    prepareInteraction();
    updatePointerPosition({
      x: clamp(event.clientX - bounds.left, 0, fieldSize.width),
      y: clamp(event.clientY - bounds.top, 0, fieldSize.height)
    }, performance.now());
  }, { passive: false });

  document.addEventListener("touchmove", (event) => {
    if (dragging && dragIntent === "trail" && event.cancelable) event.preventDefault();
  }, { passive: false });

  const finishDrag = (event, cancelled = false) => {
    if (!dragging || event.pointerId !== dragPointerId) return;
    const movement = dragStart ? Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) : Infinity;
    const touchLike = event.pointerType !== "mouse" || coarsePointer.matches;
    const completedIntent = dragIntent;
    dragging = false;
    dragPointerId = null;
    dragStart = null;
    dragIntent = null;
    root.classList.remove("is-dragging");
    pointerInside = gyroEnabled;

    if (!cancelled && completedIntent !== "scroll" && touchLike && movement <= TAP_MOVE_TOLERANCE) {
      const bounds = fieldBounds || field.getBoundingClientRect();
      const origin = {
        x: clamp(event.clientX - bounds.left, 0, fieldSize.width),
        y: clamp(event.clientY - bounds.top, 0, fieldSize.height)
      };
      showTapBurst(origin);
      disperseAll(event);
    } else {
      requestTick();
    }
    scheduleAmbientTrail(AMBIENT_RESUME_DELAY);
  };

  document.addEventListener("pointerup", (event) => finishDrag(event), { passive: true });
  document.addEventListener("pointercancel", (event) => finishDrag(event, true), { passive: true });

  document.addEventListener("click", (event) => {
    if (typeof window.PointerEvent !== "undefined" && event instanceof window.PointerEvent && event.pointerType && event.pointerType !== "mouse") return;
    if (!finePointer.matches || !isInteractionTarget(event.target)) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return;
    const bounds = fieldBounds || field.getBoundingClientRect();
    const isInside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;
    if (isInside) disperseAll(event);
  });
  gyroToggle?.addEventListener("click", toggleGyro);

  const syncMode = () => {
    const orientationSupported = typeof window.DeviceOrientationEvent !== "undefined";
    const needsMotionPermission = typeof window.DeviceOrientationEvent?.requestPermission === "function";
    const secureMotionContext = window.isSecureContext;
    const staticMode = reducedMotion.matches;
    const canUseGyro = !staticMode && coarsePointer.matches && orientationSupported && secureMotionContext;
    if (!canUseGyro && gyroEnabled) disableGyro();
    root.classList.toggle("is-static", staticMode);
    root.classList.toggle("has-coarse-pointer", coarsePointer.matches);
    if (gyroToggle instanceof HTMLButtonElement) {
      const showPermissionButton = canUseGyro && needsMotionPermission;
      const showHttpsNotice = !staticMode && coarsePointer.matches && orientationSupported && !secureMotionContext;
      gyroToggle.hidden = !showPermissionButton && !showHttpsNotice;
      gyroToggle.disabled = showHttpsNotice;
      if (showHttpsNotice) {
        gyroToggle.setAttribute("aria-label", "Tilt trail requires HTTPS");
        if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt needs HTTPS";
      } else if (!gyroEnabled) {
        gyroToggle.setAttribute("aria-label", "Enable tilt-controlled image trail");
        if (gyroLabel instanceof HTMLElement) gyroLabel.textContent = "Tilt trail";
      }
    }
    if (staticMode) {
      disableGyro();
      dragging = false;
      dragPointerId = null;
      dragStart = null;
      dragIntent = null;
      root.classList.remove("is-dragging");
      window.clearTimeout(ambientTimer);
      ambientTimer = 0;
      items.forEach((item) => {
        const timers = itemTimers.get(item) || [];
        timers.forEach((timer) => window.clearTimeout(timer));
        item.classList.remove("is-visible", "is-exiting", "is-dispersing", "is-pixel-dispersing");
        item.style.removeProperty("--trail-age-brightness");
        item.style.removeProperty("--trail-age-scale");
      });
      visibleOrder = [];
      pointerInside = false;
      active = false;
      current = null;
      previous = null;
      velocity = { x: 0, y: 0 };
      lastFrameAt = 0;
      lastEmitAt = 0;
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else {
      startInitialRendering();
      scheduleAmbientTrail(AMBIENT_TRAIL_DELAY);
      if (canUseGyro && !needsMotionPermission && !gyroEnabled) enableGyro();
    }
    syncParallax();
  };

  syncMode();
  root.classList.add("is-ready");
  syncParallax();
  reducedMotion.addEventListener?.("change", syncMode);
  finePointer.addEventListener?.("change", syncMode);
  coarsePointer.addEventListener?.("change", syncMode);
  mobileViewport.addEventListener?.("change", syncMode);
  window.addEventListener("page-transition-state", onPageTransition);
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", () => {
    items.forEach((item) => itemDimensions.delete(item));
    requestParallax();
  }, { passive: true });
};

export const initializeDitherImageTrails = () => {
  document.querySelectorAll("[data-dither-trail]").forEach(initializeTrail);
};
