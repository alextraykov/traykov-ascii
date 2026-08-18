import {
  createSketch as createAsciiCurrent,
  meta as asciiCurrentMeta
} from "./ascii-current.js";
import {
  createSketch as createBlocktypeDither,
  meta as blocktypeDitherMeta
} from "./blocktype-dither.js";
import {
  createSketch as createDitherOrbit,
  meta as ditherOrbitMeta
} from "./dither-orbit.js";
import {
  createSketch as createFloydSignal,
  meta as floydSignalMeta
} from "./floyd-signal.js";
import {
  createSketch as createLcdMemory,
  meta as lcdMemoryMeta
} from "./lcd-memory.js";

export const sketches = [
  { meta: ditherOrbitMeta, createSketch: createDitherOrbit },
  { meta: asciiCurrentMeta, createSketch: createAsciiCurrent },
  { meta: lcdMemoryMeta, createSketch: createLcdMemory },
  { meta: floydSignalMeta, createSketch: createFloydSignal },
  { meta: blocktypeDitherMeta, createSketch: createBlocktypeDither }
];
