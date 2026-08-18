import { getCssColor } from "./shared/math.js";

export const meta = {
  id: "my-sketch",
  title: "My sketch",
  technique: "Canvas 2D",
  description: "Replace this with the visual question the sketch is testing.",
  controls: [
    {
      key: "speed",
      label: "Speed",
      type: "range",
      min: 0,
      max: 2,
      step: 0.01,
      default: 0.4
    }
  ]
};

export const createSketch = ({ canvas, context, params, seed, pointer }) => {
  let width = 1;
  let height = 1;
  let dpr = 1;

  return {
    resize(nextSize) {
      ({ width, height, dpr } = nextSize);
    },

    frame({ time }) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = getCssColor("--sketch-black", "#070707");
      context.fillRect(0, 0, width, height);

      const x = pointer.inside ? pointer.x * width : width * 0.5;
      const y = pointer.inside ? pointer.y * height : height * 0.5;
      const radius = Math.min(width, height) * (0.12 + params.speed * 0.05);

      context.beginPath();
      context.arc(x, y + Math.sin(time * params.speed) * height * 0.08, radius, 0, Math.PI * 2);
      context.fillStyle = getCssColor("--sketch-paper", "#f4f2ea");
      context.fill();
    },

    destroy() {
      // Remove sketch-owned event listeners or resources here.
    }
  };
};
