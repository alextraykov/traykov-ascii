import { TAU, clamp, getCssColor, hash2 } from "./shared/math.js";

const RAMPS = {
  canonical: " .:+*#%@",
  technical: " .-/|>#",
  soft: " ·•+*✦✶✷✸✹",
  blocks: " ░▒▓█"
};

export const meta = {
  id: "ascii-current",
  title: "ASCII current",
  technique: "Procedural glyph field",
  description:
    "A live luminance field mapped through the portfolio's canonical ASCII ramp. The pointer bends the current.",
  controls: [
    { key: "density", label: "Columns", type: "range", min: 36, max: 132, step: 1, default: 82 },
    { key: "speed", label: "Flow speed", type: "range", min: 0, max: 2, step: 0.01, default: 0.42 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 2.4, step: 0.01, default: 1.08 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.4, max: 2.4, step: 0.01, default: 1.2 },
    {
      key: "ramp",
      label: "Glyph ramp",
      type: "select",
      default: "canonical",
      options: [
        { value: "canonical", label: "Canonical" },
        { value: "technical", label: "Technical" },
        { value: "soft", label: "Turntable" },
        { value: "blocks", label: "Blocks" }
      ]
    }
  ]
};

export const createSketch = ({ context, params, seed, pointer }) => {
  let width = 1;
  let height = 1;
  let dpr = 1;
  const phase = (seed % 4096) / 4096 * TAU;

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
    },

    frame({ time }) {
      const ramp = RAMPS[params.ramp] || RAMPS.canonical;
      const cols = Math.round(params.density);
      const cellWidth = width / cols;
      const fontSize = Math.max(5, cellWidth * 1.16);
      const lineHeight = fontSize * 1.08;
      const rows = Math.ceil(height / lineHeight) + 1;
      const aspect = width / Math.max(1, height);
      const flowTime = time * params.speed;
      const pointerX = pointer.inside ? pointer.x : 0.5;
      const pointerY = pointer.inside ? pointer.y : 0.5;
      const background = getCssColor("--sketch-black", "#070707");
      const foreground = getCssColor("--sketch-paper", "#f4f2ea");

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.fillStyle = foreground;
      context.font = `700 ${fontSize}px "Geist Mono", monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (let y = 0; y < rows; y += 1) {
        const v = y / Math.max(1, rows - 1);

        for (let x = 0; x < cols; x += 1) {
          const u = x / Math.max(1, cols - 1);
          const dx = (u - pointerX) * aspect;
          const dy = v - pointerY;
          const distance = Math.hypot(dx, dy);
          const pointerField = pointer.inside
            ? Math.sin(distance * 34 - flowTime * 5) * Math.exp(-distance * 4.5)
            : 0;
          const current =
            Math.sin(u * 12 * params.warp + Math.sin(v * 8 - flowTime) * 2.3 + phase) +
            Math.cos(v * 15 - flowTime * 1.8 + u * 5) * 0.62 +
            Math.sin((u + v) * 19 + flowTime * 0.7) * 0.28 +
            pointerField * 1.2;
          const grain = (hash2(x, y, seed) - 0.5) * 0.13;
          const normalized = clamp(0.5 + (current * 0.24 + grain) * params.contrast);
          const index = Math.min(ramp.length - 1, Math.floor(normalized * ramp.length));
          const glyph = ramp[index];

          if (glyph !== " ") {
            context.globalAlpha = 0.22 + normalized * 0.78;
            context.fillText(glyph, (x + 0.5) * cellWidth, (y + 0.5) * lineHeight);
          }
        }
      }

      context.globalAlpha = 1;
    }
  };
};
