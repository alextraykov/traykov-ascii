import { TAU, clamp } from "./shared/math.js";

const PALETTES = {
  mono: {
    dark: [7, 7, 7],
    light: [244, 242, 234]
  },
  cobalt: {
    dark: [5, 14, 35],
    light: [92, 196, 255]
  },
  amber: {
    dark: [24, 11, 2],
    light: [255, 184, 56]
  }
};

export const meta = {
  id: "floyd-signal",
  title: "Floyd signal",
  technique: "Floyd–Steinberg diffusion",
  description:
    "A soft analog signal converted to one bit by diffusing each pixel's quantization error into its neighbors.",
  controls: [
    { key: "pixelSize", label: "Pixel size", type: "range", min: 3, max: 12, step: 1, default: 5 },
    { key: "threshold", label: "Threshold", type: "range", min: 0.15, max: 0.85, step: 0.01, default: 0.5 },
    { key: "diffusion", label: "Error diffusion", type: "range", min: 0, max: 1.25, step: 0.01, default: 0.96 },
    { key: "speed", label: "Signal speed", type: "range", min: 0, max: 1.2, step: 0.01, default: 0.18 },
    {
      key: "palette",
      label: "Display",
      type: "select",
      default: "mono",
      options: [
        { value: "mono", label: "Monochrome" },
        { value: "cobalt", label: "Cobalt" },
        { value: "amber", label: "Amber" }
      ]
    }
  ]
};

export const createSketch = ({ context, params, seed, pointer }) => {
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d", { alpha: false });
  let width = 1;
  let height = 1;
  let dpr = 1;
  let values = new Float32Array(1);
  let pixels = sourceContext.createImageData(1, 1);
  let gridWidth = 1;
  let gridHeight = 1;
  let lastPixelSize = 0;
  const phase = (seed % 16384) / 16384 * TAU;

  const resizeGrid = () => {
    const pixelSize = Math.max(2, Math.round(params.pixelSize));
    const nextWidth = Math.max(1, Math.ceil(width / pixelSize));
    const nextHeight = Math.max(1, Math.ceil(height / pixelSize));

    if (nextWidth === gridWidth && nextHeight === gridHeight && pixelSize === lastPixelSize) return;

    gridWidth = nextWidth;
    gridHeight = nextHeight;
    lastPixelSize = pixelSize;
    sourceCanvas.width = gridWidth;
    sourceCanvas.height = gridHeight;
    values = new Float32Array(gridWidth * gridHeight);
    pixels = sourceContext.createImageData(gridWidth, gridHeight);
  };

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
      resizeGrid();
    },

    frame({ time }) {
      resizeGrid();
      const signalTime = time * params.speed;
      const focusX = pointer.inside ? pointer.x : 0.5 + Math.cos(signalTime + phase) * 0.14;
      const focusY = pointer.inside ? pointer.y : 0.5 + Math.sin(signalTime * 0.83 + phase) * 0.12;
      const palette = PALETTES[params.palette] || PALETTES.mono;

      for (let y = 0; y < gridHeight; y += 1) {
        const v = y / Math.max(1, gridHeight - 1);

        for (let x = 0; x < gridWidth; x += 1) {
          const u = x / Math.max(1, gridWidth - 1);
          const dx = u - focusX;
          const dy = v - focusY;
          const radius = Math.hypot(dx, dy);
          const wave = Math.sin(radius * 44 - signalTime * 5 + phase) * 0.24;
          const carrier = Math.sin(u * 18 + signalTime) * Math.cos(v * 13 - signalTime * 0.7) * 0.18;
          const halo = Math.exp(-radius * 5.5) * 0.54;
          values[x + y * gridWidth] = clamp(0.3 + wave + carrier + halo);
        }
      }

      for (let y = 0; y < gridHeight; y += 1) {
        for (let x = 0; x < gridWidth; x += 1) {
          const index = x + y * gridWidth;
          const oldValue = values[index];
          const nextValue = oldValue >= params.threshold ? 1 : 0;
          const error = (oldValue - nextValue) * params.diffusion;
          const color = nextValue ? palette.light : palette.dark;
          const pixelIndex = index * 4;

          pixels.data[pixelIndex] = color[0];
          pixels.data[pixelIndex + 1] = color[1];
          pixels.data[pixelIndex + 2] = color[2];
          pixels.data[pixelIndex + 3] = 255;

          if (x + 1 < gridWidth) values[index + 1] += error * (7 / 16);
          if (y + 1 >= gridHeight) continue;
          if (x > 0) values[index + gridWidth - 1] += error * (3 / 16);
          values[index + gridWidth] += error * (5 / 16);
          if (x + 1 < gridWidth) values[index + gridWidth + 1] += error * (1 / 16);
        }
      }

      sourceContext.putImageData(pixels, 0, 0);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
      context.drawImage(sourceCanvas, 0, 0, gridWidth, gridHeight, 0, 0, width, height);
    }
  };
};
