import {
  createDitherPixelDisperser,
  DITHER_DISPERSAL_DURATION,
  sampleDitherTremor,
  setDitherGlyphField
} from "./dither-pixel-dispersal.js";
import { isMotionActive, onMotionChange } from "./motion/lifecycle.js";

import { SURFACE_ASCII_RAMP } from "./structural-glyph-field.js";

const ASCII_RAMP = SURFACE_ASCII_RAMP;
const ASCII_CELL_WIDTH = 3;
const ASCII_CELL_HEIGHT = 6;
const INITIAL_RENDER_COUNT = 6;
const MOBILE_INITIAL_RENDER_COUNT = 2;
const MOBILE_RENDER_COUNT = 5;
const MOBILE_VISIBLE_LIMIT = 3;
const MIN_RENDER_EDGE = 320;
const MAX_RENDER_EDGE = 720;
const MOBILE_MAX_RENDER_EDGE = 360;
const TAP_MOVE_TOLERANCE = 12;
const TAP_BURST_HOLD = 120;
const DRAG_INTENT_THRESHOLD = 7;
const MOBILE_EMIT_INTERVAL = 84;
const GYRO_TILT_RANGE = 35;
const GYRO_NOISE_FLOOR = 1.5;
const ABOUT_AUTO_DESKTOP_VISIBLE_LIMIT = 8;
const ABOUT_AUTO_MOBILE_VISIBLE_LIMIT = 5;
const GYRO_SMOOTHING = 0.18;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toMilliseconds = (value) => {
  const trimmed = value.trim();
  if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed) || 0;
  if (trimmed.endsWith("s")) return (Number.parseFloat(trimmed) || 0) * 1_000;
  return 0;
};

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
  const sourceUrl = mobileMode
    ? item.dataset.ditherSourceMobileUrl || item.dataset.ditherSourceUrl
    : item.dataset.ditherSourceUrl;
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
  const glyphs = new Array(columns * rows).fill(" ");

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
      glyphs[y * columns + x] = glyph;
      if (glyph === " ") continue;

      context.globalAlpha = 0.76 + density * 0.24;
      context.fillText(glyph, x * ASCII_CELL_WIDTH, y * ASCII_CELL_HEIGHT);
    }
  }

  context.globalAlpha = 1;
  setDitherGlyphField(item, {
    columns,
    rows,
    cellWidth: ASCII_CELL_WIDTH,
    cellHeight: ASCII_CELL_HEIGHT,
    glyphs
  });

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
  let initialRenderingComplete = false;
  let deferredRenderingStarted = false;
  let visibleOrder = [];
  let promptsDismissed = false;
  const autoCycleEnabled = root.dataset.ditherAutoCycle === "true";
  let autoVisible = false;
  let autoActive = false;
  let autoBursting = false;
  let autoTimer = 0;
  let autoRun = 0;
  let autoImageIndex = 0;
  let autoCycleCount = 0;
  let autoManualPauseUntil = 0;
  let autoObserver;
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
        syncStaticFallback();
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

  const syncStaticFallback = () => {
    const dynamicTrailIsReady =
      isMotionActive() &&
      items.some((item) => item.classList.contains("is-ascii-rendered"));

    if (dynamicTrailIsReady) {
      root.dataset.ditherTrailRendered = "true";
    } else {
      delete root.dataset.ditherTrailRendered;
    }
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
      initialRenderingComplete = true;
      syncStaticFallback();
      if (!promptsDismissed && finePointer.matches && isMotionActive() && !isMobileMode()) {
        promptItems.forEach((item) => item.classList.add("is-prompt"));
      }
      if (isMobileMode()) startDeferredRendering();
      syncAutoCycle();
      if (!active || !current || !isMotionActive()) return;
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
    if (autoCycleEnabled) pauseAutoCycle();
    dismissPrompts();
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
    if (!gyroEnabled || dragging || !gyroTarget || !isMotionActive()) return;

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
  };

  const enableGyro = () => {
    if (gyroEnabled || !isMotionActive()) return;
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

  const getDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const syncAgeScale = () => {
    visibleOrder = visibleOrder.filter((item) => item.classList.contains("is-visible"));
    const newestIndex = visibleOrder.length - 1;

    visibleOrder.forEach((item, index) => {
      const age = newestIndex - index;
      // Older cards recede gently; they never sink into a muddy grey.
      const brightness = clamp(0.94 ** age, 0.74, 1);
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

  const showItem = (point, vector, options = {}) => {
    const {
      item: requestedItem = null,
      visibleLimit = autoCycleEnabled
        ? (isMobileMode() ? ABOUT_AUTO_MOBILE_VISIBLE_LIMIT : ABOUT_AUTO_DESKTOP_VISIBLE_LIMIT)
        : (isMobileMode() ? MOBILE_VISIBLE_LIMIT : items.length),
      persist = false,
      angle: requestedAngle = null
    } = options;
    const availableItems = items.filter((item) => item.classList.contains("is-ascii-rendered"));
    if (availableItems.length === 0) return;

    const item = requestedItem || availableItems[itemIndex % availableItems.length];
    if (!item.classList.contains("is-ascii-rendered")) return;
    if (!requestedItem) itemIndex += 1;
    stackIndex += 1;
    const existingTimers = itemTimers.get(item) || [];
    existingTimers.forEach((timer) => window.clearTimeout(timer));

    const dimensions = itemDimensions.get(item);
    const width = dimensions?.width || item.offsetWidth;
    const height = dimensions?.height || item.offsetHeight;
    const angle = Number.isFinite(requestedAngle) ? requestedAngle : clamp(vector.x * 0.028, -5, 5);
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
    while (visibleOrder.length > visibleLimit) hideItem(visibleOrder[0]);
    syncAgeScale();

    if (persist) return item;

    const exitTimer = window.setTimeout(() => item.classList.add("is-exiting"), 1150);
    const resetTimer = window.setTimeout(() => {
      item.classList.add("is-resetting");
      item.classList.remove("is-visible", "is-exiting");
      syncAgeScale();
      window.requestAnimationFrame(() => item.classList.remove("is-resetting"));
    }, 1950);
    itemTimers.set(item, [exitTimer, resetTimer]);
    return item;
  };

  const getAutoDuration = (property, fallback) => {
    const styles = getComputedStyle(root);
    return toMilliseconds(styles.getPropertyValue(property)) || toMilliseconds(styles.getPropertyValue(fallback));
  };

  const getAutoVisibleLimit = () => (
    isMobileMode() ? ABOUT_AUTO_MOBILE_VISIBLE_LIMIT : ABOUT_AUTO_DESKTOP_VISIBLE_LIMIT
  );

  const updateAutoState = (state) => {
    if (!autoCycleEnabled) return;
    root.dataset.ditherAutoState = state;
    root.dataset.ditherAutoVisibleCount = String(
      items.filter((item) => item.classList.contains("is-visible")).length
    );
    root.dataset.ditherAutoImageIndex = String(autoImageIndex);
    root.dataset.ditherAutoCycleCount = String(autoCycleCount);
  };

  const clearAutoTimer = () => {
    autoRun += 1;
    if (!autoTimer) return;
    window.clearTimeout(autoTimer);
    autoTimer = 0;
  };

  const clearAutoItems = () => {
    items.forEach((item) => {
      const timers = itemTimers.get(item) || [];
      timers.forEach((timer) => window.clearTimeout(timer));
      itemTimers.set(item, []);
      item.classList.remove(
        "is-visible",
        "is-exiting",
        "is-dispersing",
        "is-pixel-dispersing",
        "is-auto-bursting"
      );
      item.style.removeProperty("--trail-age-brightness");
      item.style.removeProperty("--trail-age-scale");
    });
    visibleOrder = [];
    updateAutoState("idle");
  };

  const canRunAutoCycle = () => (
    autoCycleEnabled &&
    autoVisible &&
    initialRenderingComplete &&
    isMotionActive() &&
    !dragging &&
    !gyroEnabled
  );

  const syncAutoVisibilityFromGeometry = () => {
    if (!autoCycleEnabled) return;
    const bounds = root.getBoundingClientRect();
    const visible =
      bounds.bottom > 0 &&
      bounds.top < window.innerHeight &&
      bounds.right > 0 &&
      bounds.left < window.innerWidth;
    if (visible === autoVisible) return;
    autoVisible = visible;
    root.dataset.ditherAutoVisible = String(autoVisible);
  };

  const scheduleAuto = (delay, callback) => {
    clearAutoTimer();
    const run = autoRun;
    autoTimer = window.setTimeout(() => {
      autoTimer = 0;
      if (run !== autoRun || !canRunAutoCycle()) {
        syncAutoCycle();
        return;
      }
      callback();
    }, delay);
  };

  const getAutoPlacement = (slot, item) => {
    const desktopPlacements = [
      [0.7, 0.18, -4],
      [0.84, 0.26, 3],
      [0.62, 0.44, -2],
      [0.82, 0.56, 4],
      [0.68, 0.73, -5],
      [0.9, 0.72, 2],
      [0.6, 0.74, 3],
      [0.87, 0.12, -3]
    ];
    const mobilePlacements = [
      [0.72, 0.52, -3],
      [0.34, 0.62, 3],
      [0.72, 0.72, -4],
      [0.32, 0.84, 4],
      [0.72, 0.88, -2]
    ];
    const [xRatio, yRatio, angle] = (isMobileMode() ? mobilePlacements : desktopPlacements)[slot % getAutoVisibleLimit()];
    const dimensions = itemDimensions.get(item);
    const width = dimensions?.width || item.offsetWidth;
    const height = dimensions?.height || item.offsetHeight;
    const minX = width / 2;
    const minY = height / 2;
    const maxX = Math.max(minX, fieldSize.width - minX);
    const maxY = Math.max(minY, fieldSize.height - minY);

    return {
      point: {
        x: clamp(fieldSize.width * xRatio, minX, maxX),
        y: clamp(fieldSize.height * yRatio, minY, maxY)
      },
      angle
    };
  };

  const burstAutoCycle = () => {
    if (!autoActive || autoBursting || !canRunAutoCycle()) return;
    autoBursting = true;
    autoCycleCount += 1;
    updateAutoState("bursting");
    const origin = { x: fieldSize.width * 0.74, y: fieldSize.height * 0.52 };
    const visibleItems = items.filter((item) => item.classList.contains("is-visible"));

    visibleItems.forEach((item, index) => {
      const x = Number.parseFloat(item.style.getPropertyValue("--trail-x")) || 0;
      const y = Number.parseFloat(item.style.getPropertyValue("--trail-y")) || 0;
      const dimensions = itemDimensions.get(item);
      const width = dimensions?.width || item.offsetWidth;
      const height = dimensions?.height || item.offsetHeight;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      let dx = centerX - origin.x;
      let dy = centerY - origin.y;
      let length = Math.hypot(dx, dy);

      if (length < 1) {
        const fallbackAngle = (index / Math.max(1, visibleItems.length)) * Math.PI * 2;
        dx = Math.cos(fallbackAngle);
        dy = Math.sin(fallbackAngle);
        length = 1;
      }

      const distance = Math.min(Math.max(fieldSize.width * 0.18, width), fieldSize.width * 0.3);
      item.style.setProperty("--trail-auto-burst-x", `${x + (dx / length) * distance}px`);
      item.style.setProperty("--trail-auto-burst-y", `${y + (dy / length) * distance}px`);
      item.style.setProperty("--trail-auto-burst-angle", `${Number.parseFloat(item.style.getPropertyValue("--trail-angle")) + (dx / length) * 8}deg`);
      item.classList.add("is-auto-bursting");
    });

    scheduleAuto(getAutoDuration("--about-trail-auto-burst", "--dur-5"), () => {
      clearAutoItems();
      autoBursting = false;
      updateAutoState("refilling");
      // Refill straight away so the field is never left empty after a burst.
      scheduleAuto(0, autoStep);
    });
  };

  const autoStep = () => {
    if (!autoActive || autoBursting || !canRunAutoCycle()) return;
    const visibleCount = items.filter((item) => item.classList.contains("is-visible")).length;
    const limit = getAutoVisibleLimit();
    if (visibleCount >= limit) {
      updateAutoState("holding");
      scheduleAuto(getAutoDuration("--about-trail-auto-hold", "--dur-4"), burstAutoCycle);
      return;
    }

    const item = items[autoImageIndex % items.length];
    autoImageIndex = (autoImageIndex + 1) % items.length;
    updateAutoState("accumulating");
    const run = autoRun;
    void ensureRendered(item).then((rendered) => {
      if (run !== autoRun || !autoActive || !canRunAutoCycle()) return;
      if (!rendered) {
        scheduleAuto(getAutoDuration("--about-trail-auto-interval", "--dur-6"), autoStep);
        return;
      }
      const placement = getAutoPlacement(visibleCount, item);
      showItem(placement.point, { x: 0, y: 0 }, {
        item,
        visibleLimit: limit,
        persist: true,
        angle: placement.angle
      });
      updateAutoState("accumulating");
      // The first two cards land close together so the collage reads at once; the rest follow on
      // the steady interval.
      const next = visibleCount < 1 ? 140 : getAutoDuration("--about-trail-auto-interval", "--dur-6");
      scheduleAuto(next, autoStep);
    });
  };

  const stopAutoCycle = (state = "paused", clearItems = true) => {
    if (!autoCycleEnabled) return;
    clearAutoTimer();
    autoActive = false;
    autoBursting = false;
    if (clearItems) clearAutoItems();
    updateAutoState(state);
  };

  const pauseAutoCycle = () => {
    if (!autoCycleEnabled) return;
    const restDuration = getAutoDuration("--about-trail-auto-rest", "--dur-6");
    autoManualPauseUntil = performance.now() + restDuration;
    stopAutoCycle("paused", false);
    if (autoVisible && isMotionActive()) scheduleAuto(restDuration, syncAutoCycle);
  };

  const syncAutoCycle = () => {
    if (!autoCycleEnabled) return;
    syncAutoVisibilityFromGeometry();
    if (!canRunAutoCycle()) {
      stopAutoCycle(isMotionActive() ? "paused" : "static");
      return;
    }
    const remainingPause = autoManualPauseUntil - performance.now();
    if (remainingPause > 0) {
      updateAutoState("paused");
      scheduleAuto(remainingPause, syncAutoCycle);
      return;
    }
    if (autoActive) return;
    dismissPrompts();
    clearAutoItems();
    autoActive = true;
    updateAutoState("accumulating");
    scheduleAuto(0, autoStep);
  };

  const emitTrail = () => {
    if (!active || !current || !isMotionActive()) return;

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
    if (!active || !current || !isMotionActive()) {
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
    stopAutoCycle("paused");
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
    window.clearTimeout(tapBurstTimer);
    tapBurst?.classList.remove("is-active", "is-fading");
  };

  const disperseAll = (event) => {
    if (!isMotionActive()) return;

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
      !isMotionActive() ||
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

    // A long drag can outlive the rest timer that prepareInteraction() queued.
    // Re-evaluate only after dragging is cleared so the opt-in cycle can resume.
    syncAutoCycle();
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
    const secureMotionContext = window.isSecureContext;
    const staticMode = !isMotionActive();
    const canUseGyro = !staticMode && coarsePointer.matches && orientationSupported && secureMotionContext;
    if (!canUseGyro && gyroEnabled) disableGyro();
    root.classList.toggle("is-static", staticMode);
    root.classList.toggle("has-coarse-pointer", coarsePointer.matches);
    if (gyroToggle instanceof HTMLButtonElement) {
      const showPermissionButton = canUseGyro;
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
      stopAutoCycle("static");
      disableGyro();
      dragging = false;
      dragPointerId = null;
      dragStart = null;
      dragIntent = null;
      root.classList.remove("is-dragging");
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
      if (isMobileMode()) promptItems.forEach((item) => item.classList.remove("is-prompt"));
    }
    syncStaticFallback();
    syncBounds();
    if (!staticMode) syncAutoCycle();
  };

  const observeAutoCycle = () => {
    if (!autoCycleEnabled || autoObserver) return;
    if ("IntersectionObserver" in window) {
      autoObserver = new IntersectionObserver(
        ([entry]) => {
          autoVisible = Boolean(entry?.isIntersecting);
          root.dataset.ditherAutoVisible = String(autoVisible);
          syncAutoCycle();
        },
        { threshold: 0.12 }
      );
      autoObserver.observe(root);
    } else {
      autoVisible = true;
      root.dataset.ditherAutoVisible = "true";
    }
  };

  if (autoCycleEnabled) {
    root.dataset.ditherAutoState = "idle";
    root.dataset.ditherAutoVisibleCount = "0";
    root.dataset.ditherAutoImageIndex = "0";
    root.dataset.ditherAutoCycleCount = "0";
    observeAutoCycle();
  }

  syncMode();
  root.classList.add("is-ready");
  onMotionChange(syncMode);
  finePointer.addEventListener?.("change", syncMode);
  coarsePointer.addEventListener?.("change", syncMode);
  mobileViewport.addEventListener?.("change", syncMode);
  window.addEventListener("page-transition-state", onPageTransition);
  window.addEventListener("resize", () => {
    items.forEach((item) => itemDimensions.delete(item));
    syncBounds();
  }, { passive: true });
  window.addEventListener("pagehide", () => {
    stopAutoCycle("paused");
    autoObserver?.disconnect();
    autoObserver = undefined;
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    observeAutoCycle();
    syncAutoCycle();
  });
};

export const initializeDitherImageTrails = () => {
  document.querySelectorAll("[data-dither-trail]").forEach(initializeTrail);
};
