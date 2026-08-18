export const TAU = Math.PI * 2;

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const lerp = (start, end, amount) => start + (end - start) * amount;

export const smoothstep = (edge0, edge1, value) => {
  const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};

export const createRandom = (seed) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash2 = (x, y, seed = 0) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.0137) * 43758.5453123;
  return value - Math.floor(value);
};

export const valueNoise2 = (x, y, seed = 0) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const ux = tx * tx * (3 - 2 * tx);
  const uy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
};

export const fractalNoise2 = (x, y, seed = 0, octaves = 4) => {
  let value = 0;
  let amplitude = 0.54;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise2(x * frequency, y * frequency, seed + octave * 97) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
};

export const getCssColor = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};
