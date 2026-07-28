export const BLOCK_RAMP = [" ", "░", "▒", "▓"];

const FONT_FAMILY = '"Departure Mono Local", "Departure Mono", monospace';

const measureTileCoverage = (context, index, tileSize) => {
  const pixels = context.getImageData(index * tileSize, 0, tileSize, tileSize).data;
  let alpha = 0;

  for (let pixel = 3; pixel < pixels.length; pixel += 4) {
    alpha += pixels[pixel] / 255;
  }

  return alpha / (tileSize * tileSize);
};

export const waitForBlockFont = async () => {
  if (!document.fonts?.load) return;
  await document.fonts.load(`16px ${FONT_FAMILY}`, BLOCK_RAMP.slice(1).join(""));
  await document.fonts.ready;
};

export const createBlockGlyphAtlas = (physicalPitch) => {
  const tileSize = Math.max(8, Math.round(physicalPitch));
  const canvas = document.createElement("canvas");
  canvas.width = tileSize * BLOCK_RAMP.length;
  canvas.height = tileSize;

  const context = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true
  });

  if (!context) {
    throw new Error("Unable to create the block glyph atlas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = `${tileSize}px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  for (let index = 1; index < BLOCK_RAMP.length; index += 1) {
    const glyph = BLOCK_RAMP[index];
    const metrics = context.measureText(glyph);
    const ascent = metrics.actualBoundingBoxAscent || tileSize * 0.78;
    const descent = metrics.actualBoundingBoxDescent || tileSize * 0.22;
    const baseline = tileSize * 0.5 + (ascent - descent) * 0.5;
    context.fillText(glyph, index * tileSize + tileSize * 0.5, baseline);
  }

  const coverage = BLOCK_RAMP.map((_, index) =>
    measureTileCoverage(context, index, tileSize)
  );
  const heavyCoverage = Math.max(coverage[3], 0.0001);
  const levels = coverage.map((value) => value / heavyCoverage);

  return {
    canvas,
    coverage,
    levels,
    tileSize
  };
};
