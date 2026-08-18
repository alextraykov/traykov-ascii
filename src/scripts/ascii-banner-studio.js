const ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];
const PREVIEW_LONG_EDGE = 1584;
const TAU = Math.PI * 2;

const FORMATS = {
  linkedin: { width: 1584, height: 396, label: "LinkedIn" },
  x: { width: 1500, height: 500, label: "X header" },
  meta: { width: 1640, height: 624, label: "Meta cover" },
  youtube: { width: 2560, height: 1440, label: "YouTube" },
  "open-graph": { width: 1200, height: 630, label: "Open Graph" },
  github: { width: 1280, height: 640, label: "GitHub social" },
  freeform: { width: 1920, height: 480, label: "Freeform" }
};

const QUALITY_LABELS = {
  native: "Native",
  retina: "Retina 2×",
  "2k": "2K",
  "4k": "4K"
};

const QUALITY_OPTIONS = {
  native: "Native platform size",
  retina: "Retina / 2×",
  "2k": "2K long edge",
  "4k": "4K long edge"
};

const PHYSICS_PARTICLE_COUNT = 42;
const REBIRTH_STEP_SECONDS = 0.12;
const REBIRTH_RECOVERY_SECONDS = 5.4;

const BASE_DEFAULTS = {
  density: 180,
  scale: 1.35,
  contrast: 1.25,
  opacity: 0.08,
  phase: 24,
  focusX: 0.56,
  focusY: 0.5,
  seed: 17,
  preset: "vortex",
  format: "linkedin",
  quality: "native",
  customWidth: 1920,
  customHeight: 480
};

const PRESETS = {
  vortex: {
    scale: 1.35,
    contrast: 1.25,
    opacity: 0.08,
    phase: 24,
    focusX: 0.56,
    focusY: 0.5,
    seed: 17
  },
  flow: {
    scale: 1.05,
    contrast: 1.4,
    opacity: 0.05,
    phase: 41,
    focusX: 0.45,
    focusY: 0.54,
    seed: 83
  },
  interference: {
    scale: 1.7,
    contrast: 1.6,
    opacity: 0.04,
    phase: 16,
    focusX: 0.5,
    focusY: 0.5,
    seed: 149
  },
  topography: {
    scale: 1.2,
    contrast: 1.7,
    opacity: 0.06,
    phase: 56,
    focusX: 0.62,
    focusY: 0.48,
    seed: 271
  },
  cells: {
    scale: 1.55,
    contrast: 1.5,
    opacity: 0.04,
    phase: 68,
    focusX: 0.5,
    focusY: 0.5,
    seed: 509
  }
};

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

const smoothstep = (edge0, edge1, value) => {
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const fract = (value) => value - Math.floor(value);

const wrap = (value) => fract(value + 1);

const hash = (x, y, seed) =>
  fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);

const createSeededRandom = (seed) => {
  let state = Math.max(1, Math.floor(seed)) >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select, [contenteditable='true']") ||
    target.isContentEditable);

const valueNoise = (x, y, seed) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, fract(x));
  const ty = smoothstep(0, 1, fract(y));
  const top = hash(x0, y0, seed) * (1 - tx) + hash(x0 + 1, y0, seed) * tx;
  const bottom =
    hash(x0, y0 + 1, seed) * (1 - tx) + hash(x0 + 1, y0 + 1, seed) * tx;
  return top * (1 - ty) + bottom * ty;
};

const fbm = (x, y, seed) => {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;

  for (let octave = 0; octave < 4; octave += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + octave * 19) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.48;
  }

  return value;
};

const cellular = (x, y, seed) => {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  let nearest = 2;
  let secondNearest = 2;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const gridX = cellX + offsetX;
      const gridY = cellY + offsetY;
      const pointX = gridX + hash(gridX, gridY, seed);
      const pointY = gridY + hash(gridX, gridY, seed + 37);
      const distance = Math.hypot(pointX - x, pointY - y);

      if (distance < nearest) {
        secondNearest = nearest;
        nearest = distance;
      } else if (distance < secondNearest) {
        secondNearest = distance;
      }
    }
  }

  return { nearest, edge: secondNearest - nearest };
};

class AsciiBannerStudio {
  constructor(root) {
    this.root = root;
    this.displayOnly = root.dataset.asciiBannerDisplayOnly === "true";
    const requestedPreset = root.dataset.asciiBannerInitialPreset;
    const initialPreset =
      requestedPreset && PRESETS[requestedPreset] ? requestedPreset : BASE_DEFAULTS.preset;
    this.stage = root.querySelector("[data-ascii-banner-stage]");
    this.canvas = root.querySelector("[data-ascii-banner-canvas]");
    this.form = root.querySelector("[data-ascii-banner-controls]");
    this.status = root.querySelector("[data-ascii-banner-status]");
    this.dimensions = root.querySelector("[data-ascii-banner-dimensions]");
    this.freeform = root.querySelector("[data-ascii-banner-freeform]");
    this.seedButton = root.querySelector("[data-ascii-banner-seed]");
    this.saveButton = root.querySelector("[data-ascii-banner-save]");
    this.playButton = root.querySelector("[data-ascii-banner-play]");
    this.fullscreenButton = root.querySelector("[data-ascii-banner-fullscreen]");
    this.presetButtons = Array.from(root.querySelectorAll("[data-ascii-banner-preset]"));
    this.formatButtons = Array.from(root.querySelectorAll("[data-ascii-banner-format]"));
    this.qualityPicker = root.querySelector("[data-ascii-banner-quality-picker]");
    this.qualityInput = root.querySelector("[data-ascii-banner-quality]");
    this.qualityTrigger = root.querySelector("[data-ascii-banner-quality-trigger]");
    this.qualityLabel = root.querySelector("[data-ascii-banner-quality-label]");
    this.qualityListbox = root.querySelector("[data-ascii-banner-quality-listbox]");
    this.qualityOptions = Array.from(
      root.querySelectorAll("[data-ascii-banner-quality-option]")
    );
    this.settings = {
      ...BASE_DEFAULTS,
      ...PRESETS[initialPreset],
      preset: initialPreset
    };
    this.dragging = false;
    this.pointer = { x: 0.5, y: 0.5, active: false };
    this.motionTime = 0;
    this.lastFrame = 0;
    this.animationFrame = 0;
    this.isInViewport = true;
    this.isFullscreen = false;
    this.rebirth = null;
    this.rebirthAccumulator = 0;
    this.physicsParticles = [];
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.isPlaying = !this.reducedMotion.matches;

    if (
      !(this.canvas instanceof HTMLCanvasElement) ||
      (!this.displayOnly && !(this.form instanceof HTMLFormElement)) ||
      !(this.stage instanceof HTMLElement)
    ) {
      return;
    }

    this.resetMotionState();
    this.bind();
    this.setupLifecycle();
    if (this.displayOnly) this.updateDimensions();
    else this.syncForm();
    if (this.draw()) this.root.dataset.asciiBannerReady = "true";
    document.fonts?.ready.then(() => this.draw());
    this.updateAnimationState();
  }

  bind() {
    if (this.displayOnly || !(this.form instanceof HTMLFormElement)) return;

    this.form.addEventListener("input", () => {
      const previousDensity = this.settings.density;
      this.readSettings();
      if (previousDensity !== this.settings.density) this.rebirth = null;
      this.syncInterface();
      this.draw();
    });

    this.form.addEventListener("reset", () => {
      window.requestAnimationFrame(() => {
        this.settings = { ...BASE_DEFAULTS };
        this.motionTime = 0;
        this.isPlaying = !this.reducedMotion.matches;
        this.resetMotionState();
        this.closeQualityPicker();
        this.syncForm();
        this.draw();
        this.updateAnimationState();
        this.announce("LinkedIn vortex defaults restored.");
      });
    });

    this.presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const preset = button.dataset.asciiBannerPreset;
        if (!preset || !PRESETS[preset]) return;
        this.applyPreset(preset);
      });
    });

    this.formatButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const format = button.dataset.asciiBannerFormat;
        if (!format || !FORMATS[format]) return;
        this.settings.format = format;
        this.rebirth = null;
        this.syncInterface();
        this.draw();
        this.announce(`${FORMATS[format].label} canvas loaded.`);
      });
    });

    this.seedButton?.addEventListener("click", () => {
      this.settings.seed = Math.floor(Math.random() * 10000) + 1;
      this.motionTime = 0;
      this.resetMotionState();
      this.draw();
      this.announce(
        "New " +
          this.settings.preset +
          " field generated. Seed " +
          this.settings.seed +
          "."
      );
    });

    this.saveButton?.addEventListener("click", () => this.save());
    this.playButton?.addEventListener("click", () => this.setPlaying(!this.isPlaying));
    this.fullscreenButton?.addEventListener("click", () => {
      void this.toggleFullscreen();
    });
    this.bindQualityPicker();

    this.canvas.addEventListener("pointerdown", (event) => {
      this.stage.focus({ preventScroll: true });
      this.dragging = true;
      this.updatePointer(event);
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
      this.moveFocus(event);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      this.updatePointer(event);
      if (this.dragging) {
        this.moveFocus(event);
      } else if (this.motionForPreset() === "physics" && !this.shouldAnimate()) {
        this.draw();
      }
    });

    this.canvas.addEventListener("pointerenter", (event) => {
      this.updatePointer(event);
    });

    this.canvas.addEventListener("pointerleave", () => {
      if (!this.dragging) this.pointer.active = false;
    });

    this.canvas.addEventListener("pointerup", (event) => {
      this.dragging = false;
      this.pointer.active = false;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      this.announce(
        `Position ${Math.round(this.settings.focusX * 100)}%, ${Math.round(
          this.settings.focusY * 100
        )}%.`
      );
    });

    this.canvas.addEventListener("pointercancel", () => {
      this.dragging = false;
      this.pointer.active = false;
    });

    window.addEventListener("keydown", (event) => this.handleShortcut(event));
  }

  setupLifecycle() {
    document.addEventListener("visibilitychange", () => {
      this.lastFrame = 0;
      this.updateAnimationState();
    });

    document.addEventListener("fullscreenchange", () => {
      this.isFullscreen = document.fullscreenElement === this.stage;
      this.root.dataset.asciiBannerFullscreen = String(this.isFullscreen);
      if (this.fullscreenButton instanceof HTMLButtonElement) {
        this.fullscreenButton.textContent = this.isFullscreen ? "Exit fullscreen" : "Fullscreen";
      }
      if (this.isFullscreen && !this.displayOnly) this.stage.focus({ preventScroll: true });
      this.lastFrame = 0;
      window.requestAnimationFrame(() => this.draw());
      this.updateAnimationState();
    });

    const resize = () => {
      this.lastFrame = 0;
      this.draw();
    };
    window.addEventListener("resize", resize);

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isFullscreen) this.draw();
      });
      this.resizeObserver.observe(this.stage);
    }

    if ("IntersectionObserver" in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries.find((candidate) => candidate.target === this.stage);
          if (!entry) return;
          this.isInViewport = entry.isIntersecting && entry.intersectionRatio > 0;
          this.lastFrame = 0;
          if (this.isInViewport) this.draw();
          this.updateAnimationState();
        },
        { threshold: 0 }
      );
      this.intersectionObserver.observe(this.stage);
    }

    const handleReducedMotion = (event) => {
      if (event.matches) this.setPlaying(false, false);
      this.draw();
    };
    if (typeof this.reducedMotion.addEventListener === "function") {
      this.reducedMotion.addEventListener("change", handleReducedMotion);
    } else {
      this.reducedMotion.addListener(handleReducedMotion);
    }
  }

  shouldAnimate() {
    return (
      this.isPlaying &&
      !document.hidden &&
      (this.isFullscreen || this.isInViewport)
    );
  }

  updateAnimationState() {
    if (this.shouldAnimate()) {
      this.scheduleAnimation();
    } else if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    this.syncPlaybackControl();
  }

  scheduleAnimation() {
    if (this.animationFrame || !this.shouldAnimate()) return;
    this.animationFrame = window.requestAnimationFrame((timestamp) => this.animate(timestamp));
  }

  animate(timestamp) {
    this.animationFrame = 0;
    if (!this.shouldAnimate()) return;

    const elapsed = this.lastFrame ? (timestamp - this.lastFrame) / 1000 : 0;
    this.lastFrame = timestamp;
    if (elapsed > 0) this.advanceMotion(clamp(elapsed, 0, 0.05));
    this.draw();
    this.scheduleAnimation();
  }

  motionForPreset(preset = this.settings.preset) {
    if (preset === "vortex" || preset === "flow") return "physics";
    if (preset === "cells") return "rebirth";
    return "random";
  }

  advanceMotion(elapsed) {
    this.motionTime += elapsed;
    if (this.motionForPreset() === "physics") this.stepPhysics(elapsed);
    if (this.motionForPreset() === "rebirth") this.advanceRebirth(elapsed);
  }

  setPlaying(nextPlaying, shouldAnnounce = true) {
    this.isPlaying = Boolean(nextPlaying);
    this.lastFrame = 0;
    this.updateAnimationState();
    if (shouldAnnounce) {
      this.announce(this.isPlaying ? "Motion playing." : "Motion paused on the current frame.");
    }
  }

  syncPlaybackControl() {
    if (!(this.playButton instanceof HTMLButtonElement)) return;
    this.playButton.setAttribute("aria-pressed", String(this.isPlaying));
    this.playButton.textContent = this.isPlaying ? "Pause motion" : "Play motion";
  }

  handleShortcut(event) {
    if (event.key === "Escape" && document.fullscreenElement === this.stage) {
      event.preventDefault();
      void this.toggleFullscreen();
      return;
    }

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditableTarget(event.target) ||
      !this.isShortcutScope(event.target)
    ) {
      return;
    }

    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void this.toggleFullscreen();
      return;
    }

    if (event.code === "Space") {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      this.setPlaying(!this.isPlaying);
      return;
    }

    if (/^[1-5]$/.test(event.key)) {
      const preset = this.presetButtons[Number(event.key) - 1]?.dataset.asciiBannerPreset;
      if (!preset || !PRESETS[preset]) return;
      event.preventDefault();
      this.applyPreset(preset);
    }
  }

  isShortcutScope(target) {
    if (document.fullscreenElement === this.stage) return true;
    if (target instanceof Element) {
      const owner = target.closest("[data-ascii-banner-studio]");
      if (owner && owner !== this.root) return false;
    }
    return this.root.matches(":hover") || this.root.contains(document.activeElement);
  }

  async toggleFullscreen() {
    if (document.fullscreenElement === this.stage) {
      try {
        await document.exitFullscreen();
      } catch {
        this.announce("The fullscreen preview could not close.");
      }
      return;
    }

    if (!this.stage.requestFullscreen) {
      this.announce("Fullscreen preview is not available in this browser.");
      return;
    }

    try {
      await this.stage.requestFullscreen({ navigationUI: "hide" });
    } catch {
      try {
        await this.stage.requestFullscreen();
      } catch {
        this.announce("The fullscreen preview could not open.");
      }
    }
  }

  bindQualityPicker() {
    if (
      !(this.qualityPicker instanceof HTMLElement) ||
      !(this.qualityInput instanceof HTMLInputElement) ||
      !(this.qualityTrigger instanceof HTMLButtonElement) ||
      !(this.qualityListbox instanceof HTMLElement)
    ) {
      return;
    }

    this.qualityTrigger.addEventListener("click", () => {
      if (this.qualityListbox.hidden) {
        this.openQualityPicker();
      } else {
        this.closeQualityPicker();
      }
    });

    this.qualityTrigger.addEventListener("keydown", (event) => {
      const selectedIndex = Math.max(
        0,
        this.qualityOptions.findIndex(
          (option) => option.dataset.asciiBannerQualityOption === this.settings.quality
        )
      );
      let nextIndex = selectedIndex;

      if (event.key === "ArrowDown") nextIndex = Math.min(this.qualityOptions.length - 1, selectedIndex + 1);
      else if (event.key === "ArrowUp") nextIndex = Math.max(0, selectedIndex - 1);
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = this.qualityOptions.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        this.closeQualityPicker();
        return;
      } else {
        return;
      }

      event.preventDefault();
      this.openQualityPicker(nextIndex);
    });

    this.qualityOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const quality = option.dataset.asciiBannerQualityOption;
        if (quality) this.selectQuality(quality, true);
      });
    });

    this.qualityListbox.addEventListener("keydown", (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("[data-ascii-banner-quality-option]")
        : null;
      const selectedIndex = Math.max(0, this.qualityOptions.indexOf(target));
      let nextIndex = selectedIndex;

      if (event.key === "ArrowDown") nextIndex = Math.min(this.qualityOptions.length - 1, selectedIndex + 1);
      else if (event.key === "ArrowUp") nextIndex = Math.max(0, selectedIndex - 1);
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = this.qualityOptions.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        this.closeQualityPicker(true);
        return;
      } else if (event.key === "Enter" || event.code === "Space") {
        event.preventDefault();
        const quality = this.qualityOptions[selectedIndex]?.dataset.asciiBannerQualityOption;
        if (quality) this.selectQuality(quality, true);
        return;
      } else {
        return;
      }

      event.preventDefault();
      this.qualityOptions[nextIndex]?.focus();
    });

    this.qualityPicker.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        if (!this.qualityPicker.contains(document.activeElement)) this.closeQualityPicker();
      });
    });

    document.addEventListener("pointerdown", (event) => {
      if (
        event.target instanceof Node &&
        !this.qualityPicker.contains(event.target)
      ) {
        this.closeQualityPicker();
      }
    });
  }

  openQualityPicker(focusIndex) {
    if (
      !(this.qualityListbox instanceof HTMLElement) ||
      !(this.qualityTrigger instanceof HTMLButtonElement)
    ) {
      return;
    }

    this.qualityListbox.hidden = false;
    this.qualityTrigger.setAttribute("aria-expanded", "true");
    if (!Number.isInteger(focusIndex)) return;
    window.requestAnimationFrame(() => this.qualityOptions[focusIndex]?.focus());
  }

  closeQualityPicker(restoreFocus = false) {
    if (
      !(this.qualityListbox instanceof HTMLElement) ||
      !(this.qualityTrigger instanceof HTMLButtonElement)
    ) {
      return;
    }

    this.qualityListbox.hidden = true;
    this.qualityTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) this.qualityTrigger.focus({ preventScroll: true });
  }

  selectQuality(quality, restoreFocus = false) {
    if (!QUALITY_OPTIONS[quality]) return;
    this.settings.quality = quality;
    if (this.qualityInput instanceof HTMLInputElement) this.qualityInput.value = quality;
    this.closeQualityPicker(restoreFocus);
    this.syncInterface();
    this.draw();
    this.announce(QUALITY_OPTIONS[quality] + " export selected.");
  }

  syncQualityPicker() {
    const label = QUALITY_OPTIONS[this.settings.quality] || QUALITY_OPTIONS.native;

    if (this.qualityLabel instanceof HTMLElement) {
      this.qualityLabel.textContent = label;
    }
    if (this.qualityTrigger instanceof HTMLButtonElement) {
      this.qualityTrigger.setAttribute("aria-label", `Choose export quality: ${label}`);
    }

    this.qualityOptions.forEach((option) => {
      option.setAttribute(
        "aria-selected",
        String(option.dataset.asciiBannerQualityOption === this.settings.quality)
      );
    });
  }

  updatePointer(event) {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.pointer.x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    this.pointer.y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    this.pointer.active = true;
  }

  applyPreset(preset) {
    const preserved = {
      density: this.settings.density,
      format: this.settings.format,
      quality: this.settings.quality,
      customWidth: this.settings.customWidth,
      customHeight: this.settings.customHeight
    };
    this.settings = {
      ...BASE_DEFAULTS,
      ...PRESETS[preset],
      ...preserved,
      preset
    };
    this.motionTime = 0;
    this.resetMotionState();
    this.syncForm();
    this.draw();
    this.announce(`${this.presetLabel(preset)} preset loaded.`);
  }

  presetLabel(preset) {
    return (
      this.presetButtons
        .find((button) => button.dataset.asciiBannerPreset === preset)
        ?.textContent?.replace(/^\s*\d+\s*\/\s*/, "")
        .trim() || preset
    );
  }

  readSettings() {
    const data = new FormData(this.form);
    this.settings.density = Number(data.get("density")) || BASE_DEFAULTS.density;
    this.settings.scale = Number(data.get("scale")) || BASE_DEFAULTS.scale;
    this.settings.contrast = Number(data.get("contrast")) || BASE_DEFAULTS.contrast;
    this.settings.opacity = Number(data.get("opacity")) || BASE_DEFAULTS.opacity;
    this.settings.phase = Number(data.get("phase")) || BASE_DEFAULTS.phase;
    const focusX = Number(data.get("focusX"));
    const focusY = Number(data.get("focusY"));
    this.settings.focusX = clamp(
      Number.isFinite(focusX) ? focusX : BASE_DEFAULTS.focusX,
      0,
      1
    );
    this.settings.focusY = clamp(
      Number.isFinite(focusY) ? focusY : BASE_DEFAULTS.focusY,
      0,
      1
    );
    const quality = String(data.get("quality") || "native");
    this.settings.quality = QUALITY_OPTIONS[quality] ? quality : "native";
    this.settings.customWidth = clamp(
      Number(data.get("customWidth")) || BASE_DEFAULTS.customWidth,
      320,
      2048
    );
    this.settings.customHeight = clamp(
      Number(data.get("customHeight")) || BASE_DEFAULTS.customHeight,
      160,
      2048
    );
  }

  syncForm() {
    Object.entries(this.settings).forEach(([name, value]) => {
      const field = this.form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
        field.value = String(value);
      }
    });
    this.syncInterface();
  }

  syncInterface() {
    this.presetButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.asciiBannerPreset === this.settings.preset)
      );
    });

    this.formatButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.asciiBannerFormat === this.settings.format)
      );
    });

    if (this.freeform instanceof HTMLElement) {
      this.freeform.hidden = this.settings.format !== "freeform";
    }

    this.syncQualityPicker();
    this.syncPlaybackControl();
    this.updateOutputs();
    this.updateDimensions();
  }

  updateOutputs() {
    Object.entries(this.settings).forEach(([name, value]) => {
      const output = this.root.querySelector(`[data-ascii-banner-output="${name}"]`);
      if (!(output instanceof HTMLOutputElement)) return;
      output.value =
        name === "focusX" || name === "focusY"
          ? `${Math.round(Number(value) * 100)}%`
          : String(value);
    });
  }

  baseSize() {
    if (this.settings.format === "freeform") {
      return {
        width: this.settings.customWidth,
        height: this.settings.customHeight,
        label: FORMATS.freeform.label
      };
    }
    return FORMATS[this.settings.format] || FORMATS.linkedin;
  }

  exportSize() {
    const base = this.baseSize();
    let scale = 1;

    if (this.settings.quality === "retina") {
      scale = 2;
    } else if (this.settings.quality === "2k") {
      scale = 2048 / Math.max(base.width, base.height);
    } else if (this.settings.quality === "4k") {
      scale = 4096 / Math.max(base.width, base.height);
    }

    return {
      width: Math.max(1, Math.round(base.width * scale)),
      height: Math.max(1, Math.round(base.height * scale)),
      label: `${base.label} · ${QUALITY_LABELS[this.settings.quality]}`
    };
  }

  previewSize() {
    if (this.isFullscreen && this.stage instanceof HTMLElement) {
      const bounds = this.stage.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      return {
        width: Math.max(1, Math.round(bounds.width * ratio)),
        height: Math.max(1, Math.round(bounds.height * ratio))
      };
    }

    const base = this.baseSize();
    const scale = Math.min(1, PREVIEW_LONG_EDGE / Math.max(base.width, base.height));
    return {
      width: Math.max(1, Math.round(base.width * scale)),
      height: Math.max(1, Math.round(base.height * scale))
    };
  }

  updateDimensions() {
    const size = this.exportSize();
    const base = this.baseSize();
    this.root.style.setProperty("--ascii-banner-aspect", `${base.width} / ${base.height}`);
    if (this.dimensions instanceof HTMLElement) {
      this.dimensions.textContent = `${size.width} × ${size.height} / ${size.label}`;
    }
  }

  moveFocus(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.settings.focusX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    this.settings.focusY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);

    const focusX = this.form.elements.namedItem("focusX");
    const focusY = this.form.elements.namedItem("focusY");
    if (focusX instanceof HTMLInputElement) focusX.value = String(this.settings.focusX);
    if (focusY instanceof HTMLInputElement) focusY.value = String(this.settings.focusY);

    this.updateOutputs();
    this.draw();
  }

  fieldTime() {
    return this.settings.phase / 36 + this.motionTime * 0.72;
  }

  coordinates(x, y) {
    const base = this.baseSize();
    return {
      px: (x - this.settings.focusX) * (this.renderAspect || base.width / base.height),
      py: y - this.settings.focusY,
      time: this.fieldTime()
    };
  }

  sampleVortex(x, y) {
    const { scale, seed } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const radius = Math.hypot(px, py);
    const angle = Math.atan2(py, px);
    const warp = fbm(px * scale + time * 0.34, py * scale - time * 0.21, seed);
    const detail = fbm(
      (px + warp * 0.42) * scale * 2.1,
      (py - warp * 0.3) * scale * 2.1,
      seed + 71
    );
    const ripple = Math.sin(radius * 12.5 - time * 2.4 + angle * 1.6) * 0.5 + 0.5;
    const core = 1 - smoothstep(0.08, 1.28, radius);
    const sweep = smoothstep(
      0.14,
      0.92,
      Math.sin(px * 1.7 + py * 3.2 + time + warp * 3.1) * 0.5 + 0.5
    );

    return clamp(
      core * 0.38 + warp * 0.34 + detail * 0.24 + ripple * 0.12 + sweep * 0.1 - 0.16,
      0,
      1
    );
  }

  sampleFlow(x, y) {
    const { scale, seed } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const angle = fbm(px * scale * 0.72, py * scale * 1.4 + time * 0.12, seed) * TAU * 2;
    const warpX = Math.cos(angle) * 0.48;
    const warpY = Math.sin(angle) * 0.32;
    const layer = fbm(
      (px + warpX) * scale * 1.25 + time * 0.2,
      (py + warpY) * scale * 2.8,
      seed + 43
    );
    const ribbon =
      Math.sin((py + warpY * 0.5) * 26 + px * 2.2 - time * 2.6) * 0.5 + 0.5;
    const current = 1 - smoothstep(0.08, 0.52, Math.abs(py + warpY * 0.7));
    return clamp(layer * 0.52 + ribbon * 0.26 + current * 0.3 - 0.18, 0, 1);
  }

  sampleInterference(x, y) {
    const { scale, seed } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const separation = 0.7 + scale * 0.18;
    const distanceA = Math.hypot(px + separation, py - 0.14);
    const distanceB = Math.hypot(px - separation, py + 0.12);
    const distanceC = Math.hypot(px * 0.72, py - 0.5);
    const waves =
      Math.sin(distanceA * 20 * scale - time * 2.4) +
      Math.sin(distanceB * 17 * scale + time * 1.7) +
      Math.sin(distanceC * 14 * scale - time * 1.1);
    const normalized = waves / 6 + 0.5;
    const grain = fbm(px * scale * 1.4, py * scale * 3.2, seed);
    return clamp(normalized * 0.74 + grain * 0.34 - 0.18, 0, 1);
  }

  sampleTopography(x, y) {
    const { scale, seed } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const firstWarp = fbm(px * scale * 0.7, py * scale * 1.7, seed);
    const elevation = fbm(
      (px + firstWarp * 0.55) * scale,
      (py - firstWarp * 0.28 + time * 0.04) * scale * 2.2,
      seed + 97
    );
    const contourPhase = fract(elevation * 8 + time * 0.34);
    const contour = 1 - smoothstep(0.06, 0.28, Math.min(contourPhase, 1 - contourPhase));
    const mass = smoothstep(0.22, 0.86, elevation);
    return clamp(contour * 0.7 + mass * 0.38 - 0.12, 0, 1);
  }

  sampleCells(x, y) {
    const { scale, seed } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const cellScale = 3.4 * scale;
    const sample = cellular(
      (px + time * 0.112) * cellScale,
      py * cellScale * 1.35,
      seed
    );
    const nuclei = 1 - smoothstep(0.04, 0.72, sample.nearest);
    const membranes = 1 - smoothstep(0.02, 0.18, sample.edge);
    const drift = fbm(px * scale * 1.1, py * scale * 2.5, seed + 211);
    return clamp(nuclei * 0.52 + membranes * 0.48 + drift * 0.22 - 0.16, 0, 1);
  }

  resetMotionState() {
    this.physicsParticles = this.createPhysicsParticles();
    this.rebirth = null;
    this.rebirthAccumulator = 0;
  }

  createPhysicsParticles() {
    const random = createSeededRandom(this.settings.seed * 131 + 17);
    return Array.from({ length: PHYSICS_PARTICLE_COUNT }, () => ({
      x: random(),
      y: random(),
      vx: (random() - 0.5) * 0.28,
      vy: (random() - 0.5) * 0.28,
      radius: 0.05 + random() * 0.09,
      energy: random()
    }));
  }

  stepPhysics(elapsed) {
    if (!this.physicsParticles.length) this.physicsParticles = this.createPhysicsParticles();

    const sampleOffset = 0.009;
    const drag = Math.exp(-1.9 * elapsed);

    this.physicsParticles.forEach((particle) => {
      const left = this.sampleLook(wrap(particle.x - sampleOffset), particle.y);
      const right = this.sampleLook(wrap(particle.x + sampleOffset), particle.y);
      const top = this.sampleLook(particle.x, clamp(particle.y - sampleOffset, 0, 1));
      const bottom = this.sampleLook(particle.x, clamp(particle.y + sampleOffset, 0, 1));
      const gradientX = right - left;
      const gradientY = bottom - top;
      let focusX = this.settings.focusX - particle.x;
      let focusY = this.settings.focusY - particle.y;

      if (Math.abs(focusX) > 0.5) focusX -= Math.sign(focusX);
      if (Math.abs(focusY) > 0.5) focusY -= Math.sign(focusY);

      let forceX = -gradientY * 0.86 + focusX * 0.16;
      let forceY = gradientX * 0.86 + focusY * 0.16;

      if (this.pointer.active) {
        let pointerX = particle.x - this.pointer.x;
        let pointerY = particle.y - this.pointer.y;
        if (Math.abs(pointerX) > 0.5) pointerX -= Math.sign(pointerX);
        if (Math.abs(pointerY) > 0.5) pointerY -= Math.sign(pointerY);
        const pointerDistance = Math.hypot(pointerX, pointerY);

        if (pointerDistance > 0 && pointerDistance < 0.34) {
          const repulsion = (1 - pointerDistance / 0.34) * 0.62;
          forceX += (pointerX / pointerDistance) * repulsion;
          forceY += (pointerY / pointerDistance) * repulsion;
        }
      }

      particle.vx = clamp((particle.vx + forceX * elapsed) * drag, -0.62, 0.62);
      particle.vy = clamp((particle.vy + forceY * elapsed) * drag, -0.62, 0.62);
      particle.x = wrap(particle.x + particle.vx * elapsed);
      particle.y = wrap(particle.y + particle.vy * elapsed);
      particle.energy = clamp(Math.hypot(particle.vx, particle.vy) / 0.62, 0, 1);
    });
  }

  samplePhysics(x, y, baseField) {
    let influence = 0;

    this.physicsParticles.forEach((particle) => {
      const deltaX = Math.min(Math.abs(x - particle.x), 1 - Math.abs(x - particle.x));
      const deltaY = Math.min(Math.abs(y - particle.y), 1 - Math.abs(y - particle.y));
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      const radiusSquared = particle.radius * particle.radius;
      if (distanceSquared >= radiusSquared) return;

      const falloff = 1 - distanceSquared / radiusSquared;
      influence += falloff * falloff * (0.68 + particle.energy * 0.32);
    });

    return clamp(baseField * 0.64 + influence * 0.78 - 0.08, 0, 1);
  }

  ensureRebirthGrid(columns, rows) {
    if (
      this.rebirth &&
      this.rebirth.columns === columns &&
      this.rebirth.rows === rows
    ) {
      return;
    }

    const random = createSeededRandom(this.settings.seed * 211 + columns * 31 + rows);
    const grid = {
      columns,
      rows,
      cells: new Float32Array(columns * rows),
      random,
      recovery: 0
    };
    const clusters = Math.max(3, Math.round(grid.cells.length / 700));

    for (let index = 0; index < clusters; index += 1) {
      this.seedRebirthCluster(
        grid,
        Math.floor(random() * columns),
        Math.floor(random() * rows)
      );
    }

    this.rebirth = grid;
  }

  seedRebirthCluster(grid, originColumn, originRow) {
    const radius = 1 + Math.floor(grid.random() * 3);

    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let columnOffset = -radius; columnOffset <= radius; columnOffset += 1) {
        const distance = Math.abs(columnOffset) + Math.abs(rowOffset);
        if (distance > radius || grid.random() > 0.82) continue;
        const column = (originColumn + columnOffset + grid.columns) % grid.columns;
        const row = (originRow + rowOffset + grid.rows) % grid.rows;
        const cell = row * grid.columns + column;
        grid.cells[cell] = Math.max(grid.cells[cell], 0.015 + grid.random() * 0.12);
      }
    }
  }

  advanceRebirth(elapsed) {
    if (!this.rebirth) return;
    this.rebirthAccumulator += elapsed;

    while (this.rebirthAccumulator >= REBIRTH_STEP_SECONDS) {
      this.rebirthAccumulator -= REBIRTH_STEP_SECONDS;
      this.stepRebirth();
    }
  }

  stepRebirth() {
    if (!this.rebirth) return;
    const grid = this.rebirth;
    const next = new Float32Array(grid.cells.length);
    let livingCells = 0;

    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const index = row * grid.columns + column;
        const age = grid.cells[index];
        if (age <= 0) continue;

        const nextAge = age + REBIRTH_STEP_SECONDS * (0.32 + grid.random() * 0.24);
        if (nextAge >= 1) continue;

        next[index] = nextAge;
        livingCells += 1;

        if (
          nextAge > 0.16 &&
          nextAge < 0.62 &&
          grid.random() < 0.045
        ) {
          const neighborColumn =
            (column + Math.floor(grid.random() * 3) - 1 + grid.columns) % grid.columns;
          const neighborRow =
            (row + Math.floor(grid.random() * 3) - 1 + grid.rows) % grid.rows;
          const neighbor = neighborRow * grid.columns + neighborColumn;

          if (next[neighbor] === 0) {
            next[neighbor] = 0.015 + grid.random() * 0.08;
            livingCells += 1;
          }
        }
      }
    }

    grid.cells = next;
    grid.recovery += REBIRTH_STEP_SECONDS;

    if (
      livingCells < Math.max(4, Math.round(grid.cells.length * 0.003)) ||
      grid.recovery >= REBIRTH_RECOVERY_SECONDS
    ) {
      const clusters = Math.max(2, Math.round(grid.cells.length / 1100));
      for (let index = 0; index < clusters; index += 1) {
        this.seedRebirthCluster(
          grid,
          Math.floor(grid.random() * grid.columns),
          Math.floor(grid.random() * grid.rows)
        );
      }
      grid.recovery = 0;
    }
  }

  sampleRandom(x, y, baseField) {
    const { px, py, time } = this.coordinates(x, y);
    const evolvingNoise = fbm(
      px * this.settings.scale * 1.6 + time * 0.38,
      py * this.settings.scale * 2.1 - time * 0.24,
      this.settings.seed + 313
    );
    const pulse =
      Math.sin(px * 8.4 + py * 13.2 + time * 2.1 + this.settings.seed) * 0.5 + 0.5;

    return clamp(baseField * 0.76 + evolvingNoise * 0.25 + pulse * 0.09 - 0.08, 0, 1);
  }

  sampleRebirth(x, y, baseField) {
    if (!this.rebirth) return baseField;
    const column = clamp(Math.floor(x * this.rebirth.columns), 0, this.rebirth.columns - 1);
    const row = clamp(Math.floor(y * this.rebirth.rows), 0, this.rebirth.rows - 1);
    const age = this.rebirth.cells[row * this.rebirth.columns + column];
    if (age <= 0) return 0;

    const born = smoothstep(0.02, 0.14, age);
    const fading = 1 - smoothstep(0.68, 1, age);
    return clamp(born * fading * (0.5 + baseField * 0.68), 0, 1);
  }

  sampleLook(x, y) {
    switch (this.settings.preset) {
      case "flow":
        return this.sampleFlow(x, y);
      case "interference":
        return this.sampleInterference(x, y);
      case "topography":
        return this.sampleTopography(x, y);
      case "cells":
        return this.sampleCells(x, y);
      default:
        return this.sampleVortex(x, y);
    }
  }

  sampleField(x, y) {
    const baseField = this.sampleLook(x, y);

    if (this.motionForPreset() === "physics") {
      return this.samplePhysics(x, y, baseField);
    }

    if (this.motionForPreset() === "rebirth") {
      return this.sampleRebirth(x, y, baseField);
    }

    return this.sampleRandom(x, y, baseField);
  }

  draw(targetCanvas = this.canvas, width, height) {
    const size = width && height ? { width, height } : this.previewSize();
    const context = targetCanvas.getContext("2d");
    if (!(context instanceof CanvasRenderingContext2D)) return false;

    const { density, contrast, opacity, seed } = this.settings;
    const styles = getComputedStyle(this.root);
    const background = styles.getPropertyValue("--ascii-banner-background").trim();
    const glyph = styles.getPropertyValue("--ascii-banner-glyph").trim();
    const columns = Math.round(density);
    const cellWidth = size.width / columns;
    const fontSize = cellWidth * 1.58;
    const lineHeight = fontSize * 0.9;
    const rows = Math.ceil(size.height / lineHeight) + 1;
    this.renderAspect = size.width / size.height;

    if (targetCanvas === this.canvas && this.motionForPreset() === "rebirth") {
      this.ensureRebirthGrid(columns, rows);
    }

    targetCanvas.width = size.width;
    targetCanvas.height = size.height;
    context.globalAlpha = 1;
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = glyph;
    context.font = `${fontSize}px "Geist Mono", "JetBrains Mono Local", monospace`;
    context.textBaseline = "top";

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column + 0.5) / columns;
        const y = (row + 0.5) / rows;
        const raw = this.sampleField(x, y);
        const shaped = clamp((raw - 0.5) * contrast + 0.5, 0, 1);
        const glyphJitter = hash(column, row, seed + 131);
        const rampValue = clamp(shaped * 0.84 + glyphJitter * 0.16, 0, 1);
        const rampIndex = Math.min(
          ASCII_RAMP.length - 1,
          Math.floor(rampValue * ASCII_RAMP.length)
        );
        const character = ASCII_RAMP[rampIndex];

        if (character === " ") continue;

        context.globalAlpha = clamp(
          opacity + Math.pow(shaped, 1.2) * (0.94 - opacity) + glyphJitter * 0.04,
          opacity,
          0.98
        );
        context.fillText(character, column * cellWidth, row * lineHeight);
      }
    }

    context.globalAlpha = 1;
    return true;
  }

  save() {
    const size = this.exportSize();
    const exportCanvas = document.createElement("canvas");
    this.draw(exportCanvas, size.width, size.height);

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        this.announce("PNG export failed.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const formatName = this.settings.format.replace(/[^a-z0-9-]/gi, "-");
      link.href = url;
      link.download = `ascii-banner-${formatName}-${this.settings.preset}-${this.settings.quality}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.announce(`${size.label} PNG saved at ${size.width} × ${size.height}.`);
    }, "image/png");
  }

  announce(message) {
    if (this.status instanceof HTMLElement) this.status.textContent = message;
  }
}

document
  .querySelectorAll("[data-ascii-banner-studio]")
  .forEach((root) => new AsciiBannerStudio(root));
