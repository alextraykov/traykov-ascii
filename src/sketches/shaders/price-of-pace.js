import { blocktypeMaterialGlsl } from "../shared/blocktype-material.js";

export const paceVertexShader = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Pass 1 runs once per character cell. It traces a turning loop (a torus)
// twice: at the current phase and at an older phase, so pass 2 can show
// rows that were copied from a frame that has already moved on.
// R/G = tone now/old, B/A = highlight now/old.
export const paceToneFragmentShader = `
precision highp float;

uniform vec2 u_grid;
uniform float u_phase;
uniform float u_old_phase;
uniform float u_wobble;

const float MAJOR = 1.0;
const float MINOR = 0.4;
const float FRAME_SHIFT = -0.08;

mat3 rotateX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

mat3 rotateZ(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

float torusDistance(vec3 p) {
  vec2 q = vec2(length(p.xz) - MAJOR, p.y);
  return length(q) - MINOR;
}

vec2 shade(vec2 screen, float phase) {
  mat3 tilt = rotateZ(-0.32 + sin(u_wobble) * 0.05) * rotateX(1.08 + sin(u_wobble * 0.7) * 0.06);
  mat3 inverseTilt = rotateX(-(1.08 + sin(u_wobble * 0.7) * 0.06)) * rotateZ(0.32 - sin(u_wobble) * 0.05);

  vec3 origin = vec3(0.0, 0.0, 3.4);
  vec3 direction = normalize(vec3(screen, -1.75));
  float travel = 0.0;
  float hit = 0.0;

  for (int i = 0; i < 64; i++) {
    vec3 p = inverseTilt * (origin + direction * travel);
    float d = torusDistance(p);
    if (d < 0.002) {
      hit = 1.0;
      break;
    }
    travel += d;
    if (travel > 7.0) break;
  }

  if (hit < 0.5) return vec2(0.0);

  vec3 world = origin + direction * travel;
  vec3 local = inverseTilt * world;
  vec2 e = vec2(0.002, 0.0);
  vec3 localNormal = normalize(vec3(
    torusDistance(local + e.xyy) - torusDistance(local - e.xyy),
    torusDistance(local + e.yxy) - torusDistance(local - e.yxy),
    torusDistance(local + e.yyx) - torusDistance(local - e.yyx)
  ));
  vec3 normal = tilt * localNormal;

  // The loop turns around its own ring: bands travel the long way round.
  float around = atan(local.z, local.x);
  float bands = fract((around + phase) * 18.0 / 6.2831853);
  float band = smoothstep(0.0, 0.08, bands) * (1.0 - smoothstep(0.5, 0.58, bands));

  vec3 light = normalize(vec3(-0.45, 0.62, 0.64));
  vec3 view = -direction;
  float diffuse = clamp(dot(normal, light) * 0.5 + 0.5, 0.0, 1.0);
  float specular = pow(max(0.0, dot(normal, normalize(light + view))), 42.0);
  float rim = pow(1.0 - max(0.0, dot(normal, view)), 3.0);

  float tone = 0.14 + diffuse * 0.56 + band * 0.3 * diffuse + rim * 0.2 + specular * 0.5;
  return vec2(clamp(tone, 0.0, 1.0), clamp(specular * 1.4 + band * rim * 0.4, 0.0, 1.0));
}

void main() {
  vec2 screen = (gl_FragCoord.xy - u_grid * 0.5) / min(u_grid.x, u_grid.y) * 2.0;
  // The near half of the tilted ring is closer, so it reads larger and
  // lower. Shift the view so the space above and below the ring matches.
  screen = screen * 0.95 + vec2(0.0, FRAME_SHIFT);

  vec2 now = shade(screen, u_phase);
  vec2 old = shade(screen, u_old_phase);
  gl_FragColor = vec4(now.x, old.x, now.y, old.y);
}
`;

// Pass 2 places a glyph in every cell. Each row reads its slip (how many
// cells it has drifted out of line) and whether it is an old copy.
export const paceGlyphFragmentShader = `
precision highp float;

uniform sampler2D u_glyph_atlas;
uniform sampler2D u_tone;
uniform sampler2D u_rows;
uniform vec2 u_resolution;
uniform vec2 u_grid;
uniform vec4 u_glyph_levels;
uniform float u_pitch;
uniform float u_seed;
uniform vec3 u_background;
uniform vec3 u_ink_dark;
uniform vec3 u_ink_light;
uniform vec3 u_highlight;
uniform vec3 u_old_dark;
uniform vec3 u_old_light;

${blocktypeMaterialGlsl}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_pitch);
  vec2 cellUv = fract(gl_FragCoord.xy / u_pitch);

  vec4 row = texture2D(u_rows, vec2(0.5, (cell.y + 0.5) / u_grid.y));
  float slip = floor(row.r * 255.0 + 0.5) - 128.0;
  float isOld = step(0.5, row.g);

  vec2 source = vec2(mod(cell.x - slip, u_grid.x), cell.y);
  vec4 tones = texture2D(u_tone, (source + 0.5) / u_grid);
  float tone = mix(tones.r, tones.g, isOld);
  float highlight = mix(tones.b, tones.a, isOld) * (1.0 - isOld);

  float orderedThreshold = blocktypeBayer4(source);
  float stableVariation =
    blocktypeHash21(floor(source / 4.0) + vec2(u_seed * 37.0, u_seed * 53.0));
  float threshold =
    clamp(mix(orderedThreshold, stableVariation, 0.16), 0.02, 0.98);

  float blockIndex = blocktypeQuantize(tone, threshold, u_glyph_levels);
  blockIndex = max(blockIndex, 3.0 * step(0.62, highlight));
  float glyphAlpha = blocktypeSampleGlyph(u_glyph_atlas, blockIndex, cellUv);

  float blockMix = blockIndex / 3.0;
  vec3 ink = mix(u_ink_dark, u_ink_light, blockMix);
  ink = mix(ink, u_highlight, smoothstep(0.3, 0.8, highlight));
  vec3 oldInk = mix(u_old_dark, u_old_light, blockMix);
  vec3 color = mix(u_background, mix(ink, oldInk, isOld), glyphAlpha);

  gl_FragColor = vec4(color, 1.0);
}
`;
