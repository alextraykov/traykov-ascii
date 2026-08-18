import { TAU, clamp, getCssColor, smoothstep } from "./shared/math.js";

const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21
].map((value) => (value + 0.5) / 64);

export const meta = {
  id: "dither-orbit",
  title: "Dither orbit",
  technique: "8 × 8 ordered dither",
  description:
    "A moving interference field reduced to two inks through an 8 × 8 Bayer threshold matrix.",
  controls: [
    { key: "cellSize", label: "Pixel size", type: "range", min: 3, max: 14, step: 1, default: 6 },
    { key: "scale", label: "Field scale", type: "range", min: 0.5, max: 3.2, step: 0.01, default: 1.32 },
    { key: "dither", label: "Dither", type: "range", min: 0, max: 1.4, step: 0.01, default: 0.84 },
    { key: "speed", label: "Drift", type: "range", min: 0, max: 1.4, step: 0.01, default: 0.22 },
    {
      key: "palette",
      label: "Ink",
      type: "select",
      default: "mono",
      options: [
        { value: "mono", label: "Paper / carbon" },
        { value: "phosphor", label: "Black / phosphor" },
        { value: "violet", label: "Violet / acid" }
      ]
    }
  ]
};

export const createSketch = ({ context, params, seed, pointer }) => {
  let width = 1;
  let height = 1;
  let dpr = 1;
  const phase = (seed % 10000) / 10000 * TAU;

  const getPalette = () => {
    if (params.palette === "phosphor") {
      return [
        getCssColor("--sketch-phosphor-dark", "#050807"),
        getCssColor("--sketch-phosphor", "#b7ff6a")
      ];
    }

    if (params.palette === "violet") {
      return [
        getCssColor("--sketch-violet", "#25103d"),
        getCssColor("--sketch-acid", "#e8ff63")
      ];
    }

    return [
      getCssColor("--sketch-paper", "#f4f2ea"),
      getCssColor("--sketch-black", "#070707")
    ];
  };

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
    },

    frame({ time }) {
      const pixel = Math.max(2, Math.round(params.cellSize));
      const cols = Math.ceil(width / pixel);
      const rows = Math.ceil(height / pixel);
      const aspect = width / Math.max(1, height);
      const drift = time * params.speed;
      const focusX = pointer.inside ? pointer.x : 0.5 + Math.cos(drift * 0.4 + phase) * 0.12;
      const focusY = pointer.inside ? pointer.y : 0.5 + Math.sin(drift * 0.33 + phase) * 0.1;
      const [paper, ink] = getPalette();

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = paper;
      context.fillRect(0, 0, width, height);
      context.fillStyle = ink;

      for (let y = 0; y < rows; y += 1) {
        const v = (y + 0.5) / rows;

        for (let x = 0; x < cols; x += 1) {
          const u = (x + 0.5) / cols;
          const dx = (u - focusX) * aspect;
          const dy = v - focusY;
          const radius = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const rings = Math.sin(radius * (32 * params.scale) - drift * 3.2 + phase);
          const fan = Math.sin(angle * 5 + radius * 13 - drift * 1.4);
          const lattice = Math.cos((dx + dy) * 18 * params.scale + drift);
          const softCore = 1 - smoothstep(0.04, 0.72, radius);
          const tone = clamp(0.48 + rings * 0.25 + fan * 0.12 + lattice * 0.08 + softCore * 0.18);
          const threshold = BAYER_8[(x % 8) + (y % 8) * 8];
          const dithered = clamp(0.5 + (tone - 0.5) / Math.max(0.02, params.dither));

          if (dithered > threshold) {
            context.fillRect(x * pixel, y * pixel, pixel + 0.35, pixel + 0.35);
          }
        }
      }
    }
  };
};
