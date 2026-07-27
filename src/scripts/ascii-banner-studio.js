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

const hash = (x, y, seed) =>
  fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);

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
    this.canvas = root.querySelector("[data-ascii-banner-canvas]");
    this.form = root.querySelector("[data-ascii-banner-controls]");
    this.status = root.querySelector("[data-ascii-banner-status]");
    this.dimensions = root.querySelector("[data-ascii-banner-dimensions]");
    this.freeform = root.querySelector("[data-ascii-banner-freeform]");
    this.seedButton = root.querySelector("[data-ascii-banner-seed]");
    this.saveButton = root.querySelector("[data-ascii-banner-save]");
    this.presetButtons = Array.from(root.querySelectorAll("[data-ascii-banner-preset]"));
    this.formatButtons = Array.from(root.querySelectorAll("[data-ascii-banner-format]"));
    this.settings = { ...BASE_DEFAULTS };
    this.dragging = false;

    if (
      !(this.canvas instanceof HTMLCanvasElement) ||
      !(this.form instanceof HTMLFormElement)
    ) {
      return;
    }

    this.bind();
    this.syncForm();
    document.fonts?.ready.then(() => this.draw());
    this.draw();
  }

  bind() {
    this.form.addEventListener("input", () => {
      this.readSettings();
      this.syncInterface();
      this.draw();
    });

    this.form.addEventListener("reset", () => {
      window.requestAnimationFrame(() => {
        this.settings = { ...BASE_DEFAULTS };
        this.syncForm();
        this.draw();
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
        this.syncInterface();
        this.draw();
        this.announce(`${FORMATS[format].label} canvas loaded.`);
      });
    });

    this.seedButton?.addEventListener("click", () => {
      this.settings.seed = Math.floor(Math.random() * 10000) + 1;
      this.draw();
      this.announce(`New ${this.settings.preset} field generated. Seed ${this.settings.seed}.`);
    });

    this.saveButton?.addEventListener("click", () => this.save());

    this.canvas.addEventListener("pointerdown", (event) => {
      this.dragging = true;
      this.canvas.setPointerCapture(event.pointerId);
      this.moveFocus(event);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (this.dragging) this.moveFocus(event);
    });

    this.canvas.addEventListener("pointerup", (event) => {
      this.dragging = false;
      this.canvas.releasePointerCapture(event.pointerId);
      this.announce(
        `Position ${Math.round(this.settings.focusX * 100)}%, ${Math.round(
          this.settings.focusY * 100
        )}%.`
      );
    });

    this.canvas.addEventListener("pointercancel", () => {
      this.dragging = false;
    });
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
    this.settings.focusX = Number(data.get("focusX"));
    this.settings.focusY = Number(data.get("focusY"));
    this.settings.quality = String(data.get("quality") || "native");
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

  coordinates(x, y) {
    const base = this.baseSize();
    return {
      px: (x - this.settings.focusX) * (base.width / base.height),
      py: y - this.settings.focusY,
      time: this.settings.phase / 36
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
    const { scale, seed, phase } = this.settings;
    const { px, py, time } = this.coordinates(x, y);
    const firstWarp = fbm(px * scale * 0.7, py * scale * 1.7, seed);
    const elevation = fbm(
      (px + firstWarp * 0.55) * scale,
      (py - firstWarp * 0.28 + time * 0.04) * scale * 2.2,
      seed + 97
    );
    const contourPhase = fract(elevation * 8 + phase / 100);
    const contour = 1 - smoothstep(0.06, 0.28, Math.min(contourPhase, 1 - contourPhase));
    const mass = smoothstep(0.22, 0.86, elevation);
    return clamp(contour * 0.7 + mass * 0.38 - 0.12, 0, 1);
  }

  sampleCells(x, y) {
    const { scale, seed, phase } = this.settings;
    const { px, py } = this.coordinates(x, y);
    const cellScale = 3.4 * scale;
    const sample = cellular(
      (px + phase * 0.003) * cellScale,
      py * cellScale * 1.35,
      seed
    );
    const nuclei = 1 - smoothstep(0.04, 0.72, sample.nearest);
    const membranes = 1 - smoothstep(0.02, 0.18, sample.edge);
    const drift = fbm(px * scale * 1.1, py * scale * 2.5, seed + 211);
    return clamp(nuclei * 0.52 + membranes * 0.48 + drift * 0.22 - 0.16, 0, 1);
  }

  sampleField(x, y) {
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

  draw(targetCanvas = this.canvas, width, height) {
    const size = width && height ? { width, height } : this.previewSize();
    const context = targetCanvas.getContext("2d");
    if (!(context instanceof CanvasRenderingContext2D)) return;

    const { density, contrast, opacity, seed } = this.settings;
    const styles = getComputedStyle(this.root);
    const background = styles.getPropertyValue("--ascii-banner-background").trim();
    const glyph = styles.getPropertyValue("--ascii-banner-glyph").trim();
    const columns = Math.round(density);
    const cellWidth = size.width / columns;
    const fontSize = cellWidth * 1.58;
    const lineHeight = fontSize * 0.9;
    const rows = Math.ceil(size.height / lineHeight) + 1;

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
