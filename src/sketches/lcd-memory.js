import { TAU, clamp, getCssColor } from "./shared/math.js";

export const meta = {
  id: "lcd-memory",
  title: "LCD memory",
  technique: "RGB subpixel simulation",
  description:
    "A synthetic LCD panel with visible RGB subpixels, scan loss, color separation, and a slow phosphor-like memory.",
  controls: [
    { key: "pitch", label: "Pixel pitch", type: "range", min: 4, max: 18, step: 1, default: 9 },
    { key: "separation", label: "RGB separation", type: "range", min: 0, max: 2.5, step: 0.01, default: 0.72 },
    { key: "scan", label: "Scan loss", type: "range", min: 0, max: 0.9, step: 0.01, default: 0.34 },
    { key: "bloom", label: "Bloom", type: "range", min: 0, max: 1.4, step: 0.01, default: 0.54 },
    { key: "speed", label: "Refresh drift", type: "range", min: 0, max: 1.2, step: 0.01, default: 0.16 }
  ]
};

export const createSketch = ({ context, params, seed, pointer }) => {
  const panelCanvas = document.createElement("canvas");
  const panelContext = panelCanvas.getContext("2d", { alpha: false });
  let width = 1;
  let height = 1;
  let dpr = 1;
  let panelWidth = 1;
  let panelHeight = 1;
  let panelPixels = panelContext.createImageData(1, 1);
  const phase = (seed % 8192) / 8192 * TAU;

  const colorToRgb = (color) => {
    const match = color.match(/^#([0-9a-f]{6})$/i);
    if (!match) return [255, 255, 255];
    const value = Number.parseInt(match[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };

  const sample = (u, v, channelOffset, time) => {
    const x = u + channelOffset * params.separation * 0.008;
    const pointerX = pointer.inside ? pointer.x : 0.5 + Math.sin(time * 0.22 + phase) * 0.12;
    const pointerY = pointer.inside ? pointer.y : 0.5;
    const dx = x - pointerX;
    const dy = v - pointerY;
    const lens = Math.exp(-(dx * dx + dy * dy) * 13);
    const band = Math.sin((x * 7.2 + v * 2.8) * TAU + time * 1.2 + phase) * 0.5 + 0.5;
    const sweep = Math.sin((v * 2.1 - x * 0.7) * TAU - time * 0.76) * 0.5 + 0.5;
    const gate = Math.sin((x - v) * 17 + phase) > 0.35 ? 0.16 : 0;
    return clamp(0.04 + band * 0.38 + sweep * 0.22 + lens * 0.72 + gate);
  };

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
    },

    frame({ time }) {
      const pitch = Math.max(3, Math.round(params.pitch));
      const cols = Math.ceil(width / pitch);
      const rows = Math.ceil(height / pitch);
      const drift = time * params.speed;
      const background = getCssColor("--sketch-lcd-black", "#020504");
      const channelColors = [
        colorToRgb(getCssColor("--sketch-lcd-red", "#ff355d")),
        colorToRgb(getCssColor("--sketch-lcd-green", "#8dff59")),
        colorToRgb(getCssColor("--sketch-lcd-blue", "#4b8dff"))
      ];

      if (panelWidth !== cols * 3 || panelHeight !== rows) {
        panelWidth = cols * 3;
        panelHeight = rows;
        panelCanvas.width = panelWidth;
        panelCanvas.height = panelHeight;
        panelPixels = panelContext.createImageData(panelWidth, panelHeight);
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      for (let y = 0; y < rows; y += 1) {
        const v = (y + 0.5) / rows;
        const scanLoss = y % 2 === 0 ? 1 : 1 - params.scan;

        for (let x = 0; x < cols; x += 1) {
          const u = (x + 0.5) / cols;
          const channelValues = [
            sample(u, v, -1, drift),
            sample(u, v, 0, drift),
            sample(u, v, 1, drift)
          ];

          for (let channel = 0; channel < 3; channel += 1) {
            const strength = channelValues[channel] * scanLoss;
            const color = channelColors[channel];
            const pixelIndex = (x * 3 + channel + y * panelWidth) * 4;
            panelPixels.data[pixelIndex] = color[0] * strength;
            panelPixels.data[pixelIndex + 1] = color[1] * strength;
            panelPixels.data[pixelIndex + 2] = color[2] * strength;
            panelPixels.data[pixelIndex + 3] = 255;
          }
        }
      }

      panelContext.putImageData(panelPixels, 0, 0);
      context.imageSmoothingEnabled = false;

      if (params.bloom > 0) {
        context.save();
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = Math.min(0.72, params.bloom * 0.5);
        context.filter = `blur(${Math.max(0.5, pitch * params.bloom * 0.42)}px)`;
        context.drawImage(panelCanvas, 0, 0, panelWidth, panelHeight, 0, 0, width, height);
        context.restore();
      }

      context.drawImage(panelCanvas, 0, 0, panelWidth, panelHeight, 0, 0, width, height);

      const refreshY = ((drift * 0.13 + phase / TAU) % 1) * height;
      context.fillStyle = getCssColor("--sketch-lcd-refresh", "rgba(244, 242, 234, 0.08)");
      context.fillRect(0, refreshY, width, Math.max(1, pitch * 0.35));
    }
  };
};
