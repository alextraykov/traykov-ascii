import {
  createBlockGlyphAtlas,
  waitForBlockFont
} from "../sketches/shared/block-glyph-atlas.js";

const ASCII_RAMP = " .:+*#%@";
const MAX_BUNDLES = 3;
const DEFAULT_SEED = 25502;
const LOOP_SECONDS = 12;
const DISPERSAL_SECONDS = 1.45;
const FRAME_INTERVAL = 1000 / 30;
const VIEW_INDEX = { specimen: 0, structure: 1, dither: 2, ascii: 3 };
const VIEW_LABEL = {
  specimen: "GPU / SPECIMEN",
  structure: "GPU / STRUCTURE",
  dither: "GPU / BLOCKTYPE ░▒▓",
  ascii: "GPU / ASCII .:+*#%@"
};

const DEFAULTS = Object.freeze({
  cellScale: 16,
  irregularity: 0.62,
  wallWidth: 0.042,
  bundleScale: 1,
  stain: 0.86,
  glyphSize: 6,
  dither: 1,
  asciiBlend: 1,
  glyphColor: "specimen"
});

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fieldFragmentSource = `
precision highp float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointer_active;
uniform float u_seed;
uniform float u_cell_scale;
uniform float u_irregularity;
uniform float u_wall_width;
uniform float u_bundle_count;
uniform float u_bundle_scale;
uniform float u_stain;
uniform float u_structure;
uniform float u_time;
uniform vec4 u_bundles[3];
uniform float u_bundle_angles[3];
uniform float u_bundle_channels[3];
uniform vec4 u_disperse_bundle;
uniform float u_disperse_angle;
uniform float u_disperse_channel;
uniform float u_disperse_progress;
uniform float u_disperse_active;
uniform vec3 u_ground;
uniform vec3 u_ground_shadow;
uniform vec3 u_wall;
uniform vec3 u_sheath;
uniform vec3 u_xylem;
uniform vec3 u_xylem_core;
uniform vec3 u_structure_bg;
uniform vec3 u_structure_ink;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345 + u_seed * 0.00037);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float x = hash21(p + vec2(17.17, 41.73));
  float y = hash21(p + vec2(83.11, 9.37));
  return vec2(x, y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.56;
  for (int octave = 0; octave < 3; octave++) {
    value += valueNoise(p) * amplitude;
    p = p * 2.03 + vec2(13.1, 7.7);
    amplitude *= 0.48;
  }
  return value;
}

vec2 rotatePoint(vec2 point, float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine) * point;
}

void cellular(
  vec2 point,
  float channel,
  float row_period,
  out float nearest,
  out float second,
  out float cell_id,
  out float seed_distance
) {
  vec2 base = floor(point);
  nearest = 100.0;
  second = 100.0;
  cell_id = 0.0;
  seed_distance = 10.0;

  for (int offset_y = -1; offset_y <= 1; offset_y++) {
    for (int offset_x = -1; offset_x <= 1; offset_x++) {
      vec2 grid = base + vec2(float(offset_x), float(offset_y));
      vec2 hash_grid = grid;
      if (row_period > 0.5) {
        hash_grid.y = mod(mod(grid.y, row_period) + row_period, row_period);
      }
      vec2 random_point = hash22(hash_grid + channel);
      vec2 feature = grid + mix(vec2(0.5), random_point, 0.42 + u_irregularity * 0.48);
      vec2 delta = feature - point;
      float identity = hash21(hash_grid + channel + 113.7);
      float angle = (hash21(hash_grid + channel + 29.4) - 0.5) * 1.5 * u_irregularity;
      float stretch = 1.0 + (hash21(hash_grid + channel + 67.8) - 0.5) * 0.7 * u_irregularity;
      vec2 local = rotatePoint(delta, angle);
      local *= vec2(stretch, 1.0 / max(0.64, stretch));
      float weight = (identity - 0.5) * 0.24 * u_irregularity;
      float distance_value = dot(local, local) - weight;

      if (distance_value < nearest) {
        second = nearest;
        nearest = distance_value;
        cell_id = identity;
        seed_distance = length(delta);
      } else if (distance_value < second) {
        second = distance_value;
      }
    }
  }
}

void vascularPattern(
  vec2 local,
  float channel,
  float inside,
  float sheath_band,
  out vec3 color,
  out float vascular_wall,
  out float xylem_band
) {
  float vascular_f1;
  float vascular_f2;
  float vascular_id;
  float vascular_seed;
  vec2 vascular_point = local * vec2(5.7, 6.8);
  cellular(
    vascular_point,
    19.0 + channel * 7.0,
    0.0,
    vascular_f1,
    vascular_f2,
    vascular_id,
    vascular_seed
  );

  float vascular_edge = max(0.0, vascular_f2 - vascular_f1);
  vascular_wall = 1.0 - smoothstep(
    u_wall_width * 0.72,
    u_wall_width * 0.72 + 0.018,
    vascular_edge
  );
  float vessel_core = 1.0 - smoothstep(0.035, 0.34, max(0.0, vascular_f1));
  xylem_band = 1.0 - smoothstep(0.18, 0.55, abs(local.y + 0.08));
  xylem_band *= 1.0 - smoothstep(0.28, 1.0, abs(local.x));
  xylem_band *= inside;
  float phloem_noise = smoothstep(0.48, 0.78, fbm(vascular_point * 0.68 + 9.0));
  float sheath_inner = inside * smoothstep(-0.72, -0.5, length(local) - 1.0);

  color = mix(u_sheath, u_wall, 0.32 + phloem_noise * 0.26);
  color = mix(
    color,
    mix(u_wall, u_xylem, u_stain),
    vascular_wall * xylem_band
  );
  color = mix(
    color,
    mix(u_ground, u_xylem_core, u_stain * 0.62),
    vessel_core * xylem_band * 0.96
  );
  color = mix(color, u_sheath, sheath_band * 0.92);
  color = mix(color, u_wall, sheath_inner * vascular_wall * 0.26);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  float loop_position = mod(
    u_time / ${LOOP_SECONDS.toFixed(1)},
    1.0
  );
  float flowing_y = uv.y - loop_position;
  float upward_phase = flowing_y * 6.28318530718;
  vec2 warp_source = vec2(
    fbm(vec2(
      uv.x * 3.1 * aspect + cos(upward_phase) * 0.72,
      sin(upward_phase) * 0.72
    ) + 7.3),
    fbm(vec2(
      uv.x * 3.1 * aspect + sin(upward_phase) * 0.72,
      cos(upward_phase) * 0.72
    ) + 31.7)
  ) - 0.5;
  float traveling_irregularity = 0.68 + 0.32 * (0.5 + 0.5 * sin(upward_phase));
  vec2 upward_flow = vec2(
    sin(upward_phase + warp_source.y * 2.4),
    cos(upward_phase + warp_source.x * 2.0)
  );
  vec2 warped_uv = vec2(uv.x, flowing_y) + (
    warp_source * 0.044 +
    upward_flow * (0.014 * traveling_irregularity)
  ) * u_irregularity;
  vec2 tissue_point = vec2(warped_uv.x * aspect, warped_uv.y) * u_cell_scale;
  float tissue_row_period = max(1.0, floor(u_cell_scale + 0.5));

  float f1;
  float f2;
  float cell_id;
  float seed_distance;
  cellular(
    tissue_point,
    0.0,
    tissue_row_period,
    f1,
    f2,
    cell_id,
    seed_distance
  );

  float edge_distance = max(0.0, f2 - f1);
  float edge_softness = 0.012 + 1.6 / max(u_resolution.x, u_resolution.y);
  float wall = 1.0 - smoothstep(
    u_wall_width,
    u_wall_width + edge_softness,
    edge_distance
  );
  float seed_dot = 1.0 - smoothstep(0.035, 0.085, seed_distance);
  float center_light = 1.0 - smoothstep(0.02, 0.72, max(0.0, f1));
  float tissue_grain = hash21(gl_FragCoord.xy + u_seed) - 0.5;
  float illumination = 0.78 + 0.22 * fbm(uv * vec2(2.2 * aspect, 2.2) + 4.0);
  float cell_tone = clamp(0.58 + cell_id * 0.28 + center_light * 0.2, 0.0, 1.0);

  vec3 interior = mix(u_ground_shadow, u_ground, cell_tone);
  interior *= illumination + tissue_grain * 0.045;
  vec3 stained_wall = mix(u_ground_shadow, u_wall, 0.36 + u_stain * 0.64);
  vec3 specimen = mix(interior, stained_wall, clamp(wall * (0.78 + u_stain * 0.32), 0.0, 1.0));

  float closest_ellipse = 100.0;
  vec2 bundle_local = vec2(0.0);
  float bundle_channel = 0.0;

  for (int bundle_index = 0; bundle_index < 3; bundle_index++) {
    float active = 1.0 - step(u_bundle_count, float(bundle_index) + 0.5);
    vec4 bundle = u_bundles[bundle_index];
    vec2 local = rotatePoint(uv - bundle.xy, -u_bundle_angles[bundle_index]);
    local /= max(vec2(0.001), bundle.zw * u_bundle_scale);
    float ellipse = length(local) - 1.0;
    if (active > 0.5 && ellipse < closest_ellipse) {
      closest_ellipse = ellipse;
      bundle_local = local;
      bundle_channel = u_bundle_channels[bundle_index];
    }
  }

  float bundle_inside = 1.0 - smoothstep(-0.004, 0.006, closest_ellipse);
  float sheath_band = bundle_inside * smoothstep(-0.055, -0.038, closest_ellipse);
  vec3 bundle_color;
  float vascular_wall;
  float xylem_band;
  vascularPattern(
    bundle_local,
    bundle_channel,
    bundle_inside,
    sheath_band,
    bundle_color,
    vascular_wall,
    xylem_band
  );

  specimen = mix(specimen, bundle_color, bundle_inside);

  vec3 structure = mix(u_structure_bg, u_structure_ink, wall * 0.9);
  structure = mix(structure, u_structure_ink, seed_dot * 0.92);
  vec3 bundle_structure = mix(u_structure_bg, u_structure_ink, 0.12 + vascular_wall * 0.7);
  bundle_structure = mix(bundle_structure, u_xylem, xylem_band * (0.24 + vascular_wall * 0.76));
  structure = mix(structure, bundle_structure, bundle_inside);
  structure = mix(structure, u_structure_ink, sheath_band);

  if (u_disperse_active > 0.5) {
    vec2 disperse_local = rotatePoint(
      uv - u_disperse_bundle.xy,
      -u_disperse_angle
    );
    disperse_local /= max(
      vec2(0.001),
      u_disperse_bundle.zw * u_bundle_scale
    );
    float disperse_ellipse = length(disperse_local) - 1.0;
    float disperse_inside = 1.0 - smoothstep(-0.004, 0.006, disperse_ellipse);
    float disperse_sheath = disperse_inside *
      smoothstep(-0.055, -0.038, disperse_ellipse);
    vec3 disperse_color;
    float disperse_wall;
    float disperse_xylem;
    vascularPattern(
      disperse_local,
      u_disperse_channel,
      disperse_inside,
      disperse_sheath,
      disperse_color,
      disperse_wall,
      disperse_xylem
    );

    float breakup_pattern = clamp(
      fbm(disperse_local * vec2(3.8, 4.4) + u_disperse_channel * 1.37) * 0.58 +
      (disperse_local.y * 0.5 + 0.5) * 0.24 +
      (1.0 - wall) * 0.18,
      0.0,
      1.0
    );
    float breakup_threshold = mix(-0.12, 1.12, u_disperse_progress);
    float remaining = smoothstep(
      breakup_threshold - 0.065,
      breakup_threshold + 0.065,
      breakup_pattern
    ) * disperse_inside;
    specimen = mix(specimen, disperse_color, remaining);

    vec3 disperse_structure = mix(
      u_structure_bg,
      u_structure_ink,
      0.12 + disperse_wall * 0.7
    );
    disperse_structure = mix(
      disperse_structure,
      u_xylem,
      disperse_xylem * (0.24 + disperse_wall * 0.76)
    );
    structure = mix(structure, disperse_structure, remaining);
    structure = mix(
      structure,
      u_structure_ink,
      disperse_sheath * remaining
    );
  }

  vec2 pointer_delta = (uv - u_pointer) * vec2(aspect, 1.0);
  float pointer_distance = length(pointer_delta);
  float lens = (1.0 - smoothstep(0.165, 0.185, pointer_distance)) * u_pointer_active;
  float lens_ring = (
    smoothstep(0.178, 0.184, pointer_distance) -
    smoothstep(0.184, 0.194, pointer_distance)
  ) * u_pointer_active;
  float structure_mix = max(u_structure, lens);
  vec3 color = mix(specimen, structure, structure_mix);
  color = mix(color, u_xylem, lens_ring * 0.72 * (1.0 - u_structure));

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const compositeFragmentSource = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_field;
uniform sampler2D u_glyph_atlas;
uniform sampler2D u_block_atlas;
uniform vec2 u_resolution;
uniform float u_view;
uniform float u_glyph_size;
uniform float u_block_pitch;
uniform float u_dither;
uniform float u_ascii_blend;
uniform float u_glyph_monochrome;
uniform vec4 u_block_levels;
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform vec3 u_block_background;
uniform vec3 u_block_accent;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float bayer4(vec2 point) {
  vec2 index = mod(point, 4.0);
  float key = index.x + index.y * 4.0;
  if (key < 0.5) return 0.03125;
  if (key < 1.5) return 0.53125;
  if (key < 2.5) return 0.15625;
  if (key < 3.5) return 0.65625;
  if (key < 4.5) return 0.78125;
  if (key < 5.5) return 0.28125;
  if (key < 6.5) return 0.90625;
  if (key < 7.5) return 0.40625;
  if (key < 8.5) return 0.21875;
  if (key < 9.5) return 0.71875;
  if (key < 10.5) return 0.09375;
  if (key < 11.5) return 0.59375;
  if (key < 12.5) return 0.96875;
  if (key < 13.5) return 0.46875;
  if (key < 14.5) return 0.84375;
  return 0.34375;
}

float sampleBlockGlyph(float block_index, vec2 cell_uv) {
  vec2 atlas_uv = vec2(
    (block_index + cell_uv.x) * 0.25,
    cell_uv.y
  );
  return texture2D(u_block_atlas, atlas_uv).a;
}

void main() {
  vec3 source = texture2D(u_field, v_uv).rgb;
  vec3 color = source;

  if (u_view > 1.5 && u_view < 2.5) {
    float pitch = max(8.0, u_block_pitch);
    vec2 cell = floor(gl_FragCoord.xy / pitch);
    vec2 cell_uv = fract(gl_FragCoord.xy / pitch);
    vec2 sample_uv = ((cell + 0.5) * pitch) / u_resolution;
    vec3 sampled = texture2D(u_field, clamp(sample_uv, 0.0, 1.0)).rgb;
    float tone = luminance(sampled);
    tone = clamp((tone - 0.08) / 0.84, 0.0, 1.0);

    float lower_index = 0.0;
    float lower_level = u_block_levels.x;
    float upper_level = u_block_levels.y;
    if (tone > u_block_levels.y) {
      lower_index = 1.0;
      lower_level = u_block_levels.y;
      upper_level = u_block_levels.z;
    }
    if (tone > u_block_levels.z) {
      lower_index = 2.0;
      lower_level = u_block_levels.z;
      upper_level = u_block_levels.w;
    }

    float fraction = (tone - lower_level) /
      max(0.0001, upper_level - lower_level);
    float threshold = mix(0.5, bayer4(cell), u_dither);
    float block_index = lower_index + step(threshold, fraction);
    float block_alpha = sampleBlockGlyph(block_index, cell_uv);
    color = mix(u_block_background, u_block_accent, block_alpha);
  }

  if (u_view > 2.5) {
    float glyph_size = max(4.0, u_glyph_size);
    vec2 cell = floor(gl_FragCoord.xy / glyph_size);
    vec2 cell_uv = fract(gl_FragCoord.xy / glyph_size);
    vec2 sample_uv = ((cell + 0.5) * glyph_size) / u_resolution;
    vec3 sampled = texture2D(u_field, clamp(sample_uv, 0.0, 1.0)).rgb;
    float tone = luminance(sampled);
    tone += (bayer4(cell) - 0.5) * u_dither * 0.38;
    float glyph_index = floor(clamp(tone, 0.0, 0.9999) * 8.0);
    vec2 atlas_uv = vec2((glyph_index + cell_uv.x) / 8.0, cell_uv.y);
    float coverage = texture2D(u_glyph_atlas, atlas_uv).a;

    vec3 specimen_background = sampled * 0.11;
    vec3 specimen_glyph = sampled * (0.88 + tone * 0.24);
    vec3 background = mix(specimen_background, u_paper, u_glyph_monochrome);
    vec3 glyph_color = mix(specimen_glyph, u_ink, u_glyph_monochrome);
    vec3 ascii_layer = mix(background, glyph_color, coverage);
    color = mix(source, ascii_layer, u_ascii_blend);
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

const createSeed = () => {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  }
  return Math.max(1, Math.floor(Math.random() * 0xffffffff));
};

const mulberry32 = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const parseCssColor = (value, fallback) => {
  const normalized = String(value || fallback).trim();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((character) => character + character)
            .join("")
        : hex[1];
    const number = Number.parseInt(raw, 16);
    return [
      ((number >> 16) & 255) / 255,
      ((number >> 8) & 255) / 255,
      (number & 255) / 255
    ];
  }

  const rgb = normalized.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*[\d.]+)?\s*\)$/i
  );
  if (rgb) {
    return rgb.slice(1, 4).map((channel) => Number(channel) / 255);
  }

  return parseCssColor(fallback, "#000000");
};

class RhizomeField {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector("[data-rhizome-stage]");
    this.canvas = root.querySelector("[data-rhizome-canvas]");
    this.fallback = root.querySelector("[data-rhizome-fallback]");
    this.form = root.querySelector("[data-rhizome-controls]");
    this.status = root.querySelector("[data-rhizome-status]");
    this.resolution = root.querySelector("[data-rhizome-resolution]");
    this.technique = root.querySelector("[data-rhizome-technique]");
    this.seedReadout = root.querySelector("[data-rhizome-seed-readout]");
    this.viewButtons = Array.from(root.querySelectorAll("[data-rhizome-view]"));
    this.seedButton = root.querySelector("[data-rhizome-seed]");
    this.inputs = Array.from(root.querySelectorAll("[data-rhizome-control]"));

    if (
      !(this.stage instanceof HTMLElement) ||
      !(this.canvas instanceof HTMLCanvasElement) ||
      !(this.form instanceof HTMLFormElement)
    ) {
      throw new Error("Rhizome field markup is incomplete.");
    }

    this.seed = DEFAULT_SEED;
    this.view = "specimen";
    this.settings = { ...DEFAULTS };
    this.pointer = { x: 0.5, y: 0.5, active: false, down: false };
    this.pointerPress = null;
    this.bundles = [];
    this.bundleSerial = 0;
    this.dispersal = null;
    this.frameHandle = 0;
    this.needsRender = true;
    this.lastRenderTime = 0;
    this.renderCount = 0;
    this.inViewport = true;
    this.coarsePointer = window.matchMedia("(pointer: coarse)");
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.onInput = this.onInput.bind(this);
    this.onReset = this.onReset.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onThemeChange = this.onThemeChange.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onContextLost = this.onContextLost.bind(this);
    this.onContextRestored = this.onContextRestored.bind(this);
    this.onAnimationFrame = this.onAnimationFrame.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onMotionChange = this.onMotionChange.bind(this);
    this.onIntersection = this.onIntersection.bind(this);

    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });

    if (!this.gl) {
      this.showFallback("WebGL is unavailable. Showing the reference specimen.");
      return;
    }

    this.createResources();
    this.generateBundles();
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.stage);
    this.intersectionObserver = new IntersectionObserver(this.onIntersection, {
      rootMargin: "120px 0px"
    });
    this.intersectionObserver.observe(this.root);
    this.syncSettings();
    this.updateOutputs();
    this.updateView();
    this.updateGlyphAtlas();
    this.updateBlockGlyphAtlas();
    this.root.dataset.state = "ready";
    this.fallback?.setAttribute("aria-hidden", "true");
    this.onResize();
    this.requestRender();

    document.fonts?.load('700 48px "Geist Mono"').then(() => {
      if (!this.destroyed) {
        this.updateGlyphAtlas();
        this.requestRender();
      }
    });
    waitForBlockFont()
      .then(() => {
        if (!this.destroyed) {
          this.blockAtlasKey = "";
          this.updateBlockGlyphAtlas();
          this.requestRender();
        }
      })
      .catch((error) => {
        console.warn("[rhizome-field] Departure Mono atlas fallback.", error);
      });
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not allocate shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Shader compilation failed.";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  createProgram(vertex, fragment) {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error("Could not allocate shader program.");
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertex);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Shader link failed.";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  uniformMap(program, names) {
    return Object.fromEntries(
      names.map((name) => [name, this.gl.getUniformLocation(program, name)])
    );
  }

  createResources() {
    const gl = this.gl;
    this.deleteResources();
    this.fieldProgram = this.createProgram(vertexSource, fieldFragmentSource);
    this.compositeProgram = this.createProgram(vertexSource, compositeFragmentSource);
    this.fieldPosition = gl.getAttribLocation(this.fieldProgram, "a_position");
    this.compositePosition = gl.getAttribLocation(this.compositeProgram, "a_position");
    this.fieldUniforms = this.uniformMap(this.fieldProgram, [
      "u_resolution",
      "u_pointer",
      "u_pointer_active",
      "u_seed",
      "u_cell_scale",
      "u_irregularity",
      "u_wall_width",
      "u_bundle_count",
      "u_bundle_scale",
      "u_stain",
      "u_structure",
      "u_time",
      "u_bundles[0]",
      "u_bundle_angles[0]",
      "u_bundle_channels[0]",
      "u_disperse_bundle",
      "u_disperse_angle",
      "u_disperse_channel",
      "u_disperse_progress",
      "u_disperse_active",
      "u_ground",
      "u_ground_shadow",
      "u_wall",
      "u_sheath",
      "u_xylem",
      "u_xylem_core",
      "u_structure_bg",
      "u_structure_ink"
    ]);
    this.compositeUniforms = this.uniformMap(this.compositeProgram, [
      "u_field",
      "u_glyph_atlas",
      "u_block_atlas",
      "u_resolution",
      "u_view",
      "u_glyph_size",
      "u_block_pitch",
      "u_dither",
      "u_ascii_blend",
      "u_glyph_monochrome",
      "u_block_levels",
      "u_ink",
      "u_paper",
      "u_block_background",
      "u_block_accent"
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    this.fieldTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.fieldTexture,
      0
    );

    this.glyphTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.blockGlyphTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.blockGlyphTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.blockAtlasKey = "";
    this.blockAtlas = null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  deleteResources() {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.fieldProgram) gl.deleteProgram(this.fieldProgram);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.fieldTexture) gl.deleteTexture(this.fieldTexture);
    if (this.glyphTexture) gl.deleteTexture(this.glyphTexture);
    if (this.blockGlyphTexture) gl.deleteTexture(this.blockGlyphTexture);
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    this.fieldProgram = null;
    this.compositeProgram = null;
    this.quadBuffer = null;
    this.fieldTexture = null;
    this.glyphTexture = null;
    this.blockGlyphTexture = null;
    this.blockAtlas = null;
    this.blockAtlasKey = "";
    this.framebuffer = null;
  }

  bindEvents() {
    this.form.addEventListener("input", this.onInput);
    this.form.addEventListener("change", this.onInput);
    this.form.addEventListener("reset", this.onReset);
    this.seedButton?.addEventListener("click", () => {
      this.seed = createSeed();
      this.generateBundles();
      this.updateOutputs();
      this.requestRender();
      this.announce(`New specimen generated. Seed ${this.seed}.`);
    });
    this.viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.view = button.dataset.rhizomeView || "specimen";
        this.updateView();
        this.onResize();
        this.announce(`${this.view} view active.`);
      });
    });

    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("focus", this.onFocus);
    this.canvas.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    window.addEventListener("themechange", this.onThemeChange);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.reducedMotion.addEventListener?.("change", this.onMotionChange);
    window.addEventListener("pagehide", () => this.destroy(), { once: true });
  }

  syncSettings() {
    const formData = new FormData(this.form);
    for (const key of [
      "cellScale",
      "irregularity",
      "wallWidth",
      "bundleScale",
      "stain",
      "glyphSize",
      "dither",
      "asciiBlend"
    ]) {
      const value = Number(formData.get(key));
      if (Number.isFinite(value)) this.settings[key] = value;
    }
    this.settings.glyphColor =
      formData.get("glyphColor") === "monochrome" ? "monochrome" : "specimen";
  }

  onInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const previousGlyphSize = this.settings.glyphSize;
    this.syncSettings();
    this.updateOutputs();
    if (target.name === "glyphSize" || previousGlyphSize !== this.settings.glyphSize) {
      this.onResize();
    } else {
      this.requestRender();
    }
  }

  onReset() {
    window.setTimeout(() => {
      this.seed = DEFAULT_SEED;
      this.view = "specimen";
      this.settings = { ...DEFAULTS };
      this.syncSettings();
      this.generateBundles();
      this.updateOutputs();
      this.updateView();
      this.onResize();
      this.announce("Reference specimen restored. Seed 25502.");
    }, 0);
  }

  updateOutputs() {
    const formats = {
      cellScale: (value) => String(Math.round(value)),
      irregularity: (value) => value.toFixed(2),
      wallWidth: (value) => value.toFixed(3),
      bundleScale: (value) => value.toFixed(2),
      stain: (value) => value.toFixed(2),
      glyphSize: (value) => `${Math.round(value)} px`,
      dither: (value) => value.toFixed(2),
      asciiBlend: (value) => value.toFixed(2)
    };

    for (const [name, formatter] of Object.entries(formats)) {
      const output = this.root.querySelector(`[data-rhizome-output="${name}"]`);
      if (output instanceof HTMLOutputElement) {
        output.value = formatter(this.settings[name]);
      }
    }
    const bundleOutput = this.root.querySelector(
      '[data-rhizome-output="bundleCount"]'
    );
    if (bundleOutput instanceof HTMLOutputElement) {
      bundleOutput.value = `${this.bundles.length} / ${MAX_BUNDLES}`;
    }
    if (this.seedReadout) this.seedReadout.textContent = String(this.seed);
  }

  updateView() {
    this.root.dataset.view = this.view;
    this.viewButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.rhizomeView === this.view)
      );
    });
    if (this.technique) this.technique.textContent = VIEW_LABEL[this.view];
  }

  generateBundles() {
    const random = mulberry32(this.seed);
    const centers = [
      [0.3 + random() * 0.14, 0.5 + random() * 0.14],
      [0.9 + random() * 0.13, 0.08 + random() * 0.16]
    ];
    this.bundleSerial = 0;
    this.dispersal = null;
    this.bundles = centers.map(([x, y], index) => {
      const dominance = index === 0 ? 1.28 : 0.86;
      return this.createBundle(x, y, random, dominance);
    });
    this.syncBundleUniformData();
  }

  createBundle(x, y, random, dominance = 0.82 + random() * 0.28) {
    this.bundleSerial += 1;
    return {
      x,
      y,
      axisX: (0.13 + random() * 0.035) * dominance,
      axisY: (0.095 + random() * 0.03) * dominance,
      angle: (random() - 0.5) * 0.5,
      channel: this.bundleSerial + (this.seed % 997) * 0.013
    };
  }

  syncBundleUniformData() {
    this.bundleData = new Float32Array(MAX_BUNDLES * 4);
    this.bundleAngles = new Float32Array(MAX_BUNDLES);
    this.bundleChannels = new Float32Array(MAX_BUNDLES);
    this.bundles.forEach((bundle, index) => {
      const offset = index * 4;
      this.bundleData[offset] = bundle.x;
      this.bundleData[offset + 1] = bundle.y;
      this.bundleData[offset + 2] = bundle.axisX;
      this.bundleData[offset + 3] = bundle.axisY;
      this.bundleAngles[index] = bundle.angle;
      this.bundleChannels[index] = bundle.channel;
    });
  }

  addBundleAt(x, y) {
    const pointSeed = (
      this.seed ^
      Math.imul(this.bundleSerial + 1, 0x9e3779b1) ^
      Math.floor(x * 65535) ^
      Math.imul(Math.floor(y * 65535), 0x85ebca6b)
    ) >>> 0;
    const random = mulberry32(pointSeed || 1);
    const bundle = this.createBundle(
      clamp(x, 0.04, 0.96),
      clamp(y, 0.04, 0.96),
      random
    );
    let removed = null;
    if (this.bundles.length >= MAX_BUNDLES) {
      removed = this.bundles.shift();
    }
    this.bundles.push(bundle);
    this.syncBundleUniformData();

    if (removed && !this.reducedMotion.matches) {
      this.dispersal = {
        bundle: removed,
        startedAt: performance.now()
      };
    } else {
      this.dispersal = null;
    }

    this.updateOutputs();
    this.requestRender();
    if (removed) {
      this.announce(
        `Bundle added. The oldest bundle is dispersing into cells. ${MAX_BUNDLES} of ${MAX_BUNDLES} intact.`
      );
    } else {
      this.announce(
        `Bundle added. ${this.bundles.length} of ${MAX_BUNDLES} intact.`
      );
    }
  }

  updateGlyphAtlas() {
    if (!this.gl || !this.glyphTexture) return;
    const cellSize = 64;
    const atlas = document.createElement("canvas");
    atlas.width = cellSize * ASCII_RAMP.length;
    atlas.height = cellSize;
    const context = atlas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, atlas.width, atlas.height);
    context.fillStyle = "#ffffff";
    context.font = '700 50px "Geist Mono", "SFMono-Regular", monospace';
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let index = 0; index < ASCII_RAMP.length; index += 1) {
      context.fillText(ASCII_RAMP[index], index * cellSize + cellSize * 0.5, cellSize * 0.51);
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlas
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  updateBlockGlyphAtlas() {
    if (!this.gl || !this.blockGlyphTexture) return;
    const physicalPitch = Math.max(
      8,
      Math.round(this.settings.glyphSize * (this.pixelScale || 1))
    );
    const nextKey = String(physicalPitch);
    if (nextKey === this.blockAtlasKey && this.blockAtlas) return;

    const atlas = createBlockGlyphAtlas(physicalPitch);
    const increasing = atlas.coverage.every(
      (coverage, index) => index === 0 || coverage > atlas.coverage[index - 1]
    );
    if (!increasing) {
      throw new Error("Blocktype glyph coverage is not strictly increasing.");
    }

    this.blockAtlasKey = nextKey;
    this.blockAtlas = atlas;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blockGlyphTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlas.canvas
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  updatePointer(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.x = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    this.pointer.y = clamp(
      1 - (event.clientY - bounds.top) / Math.max(1, bounds.height),
      0,
      1
    );
    this.pointer.active = true;
    this.requestRender();
  }

  onPointerMove(event) {
    if (event.pointerType !== "mouse" && !this.pointer.down) return;
    if (this.pointerPress?.pointerId === event.pointerId) {
      const distance = Math.hypot(
        event.clientX - this.pointerPress.clientX,
        event.clientY - this.pointerPress.clientY
      );
      if (distance > 7) this.pointerPress.moved = true;
    }
    this.updatePointer(event);
  }

  onPointerDown(event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    this.pointer.down = true;
    this.pointerPress = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false
    };
    this.canvas.setPointerCapture?.(event.pointerId);
    this.updatePointer(event);
  }

  onPointerUp(event) {
    const shouldAddBundle =
      this.pointerPress?.pointerId === event.pointerId &&
      !this.pointerPress.moved &&
      event.type === "pointerup";
    this.pointer.down = false;
    if (this.canvas.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    if (shouldAddBundle) {
      this.updatePointer(event);
      this.addBundleAt(this.pointer.x, this.pointer.y);
    }
    this.pointerPress = null;
    if (event.pointerType !== "mouse") {
      this.pointer.active = false;
      this.requestRender();
    }
  }

  onPointerLeave() {
    if (this.pointer.down) return;
    this.pointer.active = false;
    this.requestRender();
  }

  onFocus() {
    this.pointer.active = true;
    this.requestRender();
  }

  onBlur() {
    this.pointer.active = false;
    this.requestRender();
  }

  onKeyDown(event) {
    const step = event.shiftKey ? 0.08 : 0.025;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.addBundleAt(this.pointer.x, this.pointer.y);
      return;
    }
    if (event.key === "ArrowLeft") this.pointer.x -= step;
    else if (event.key === "ArrowRight") this.pointer.x += step;
    else if (event.key === "ArrowUp") this.pointer.y += step;
    else if (event.key === "ArrowDown") this.pointer.y -= step;
    else if (event.key === "Home") {
      this.pointer.x = 0.5;
      this.pointer.y = 0.5;
    } else if (event.key === "Escape") {
      this.pointer.active = false;
      this.canvas.blur();
      return;
    } else {
      return;
    }
    event.preventDefault();
    this.pointer.x = clamp(this.pointer.x, 0, 1);
    this.pointer.y = clamp(this.pointer.y, 0, 1);
    this.pointer.active = true;
    this.requestRender();
  }

  onThemeChange() {
    this.colors = null;
    this.requestRender();
  }

  onVisibilityChange() {
    if (document.visibilityState === "visible") this.requestRender();
  }

  onMotionChange() {
    if (this.reducedMotion.matches) this.dispersal = null;
    this.requestRender();
  }

  onIntersection(entries) {
    const entry = entries.find((candidate) => candidate.target === this.root);
    if (!entry) return;
    this.inViewport = entry.isIntersecting;
    if (this.inViewport) this.requestRender();
  }

  shouldAnimate() {
    return (
      !this.reducedMotion.matches &&
      this.inViewport &&
      document.visibilityState === "visible" &&
      this.root.dataset.state === "ready"
    );
  }

  onResize() {
    if (!this.gl || this.contextLost || this.destroyed) return;
    const bounds = this.stage.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(bounds.width));
    const cssHeight = Math.max(1, Math.round(bounds.height));
    const maxPixels = this.coarsePointer.matches ? 393216 : 1048576;
    const dprCap = this.coarsePointer.matches ? 1.5 : 2;
    const pixelScale = Math.min(
      dprCap,
      Math.sqrt(maxPixels / Math.max(1, cssWidth * cssHeight))
    );
    this.pixelScale = Math.max(0.5, pixelScale);
    this.canvas.width = Math.max(1, Math.round(cssWidth * this.pixelScale));
    this.canvas.height = Math.max(1, Math.round(cssHeight * this.pixelScale));
    this.updateBlockGlyphAtlas();

    if (this.view === "ascii") {
      this.fieldWidth = Math.max(
        64,
        Math.min(
          this.canvas.width,
          Math.ceil((cssWidth / this.settings.glyphSize) * 2)
        )
      );
      this.fieldHeight = Math.max(
        64,
        Math.min(
          this.canvas.height,
          Math.ceil((cssHeight / this.settings.glyphSize) * 2)
        )
      );
    } else {
      this.fieldWidth = this.canvas.width;
      this.fieldHeight = this.canvas.height;
    }

    this.resizeFramebuffer(this.fieldWidth, this.fieldHeight);
    if (this.resolution) {
      this.resolution.textContent =
        this.view === "ascii"
          ? `${this.canvas.width} × ${this.canvas.height} / FIELD ${this.fieldWidth} × ${this.fieldHeight}`
          : `${this.canvas.width} × ${this.canvas.height}`;
    }
    this.root.dataset.fieldSize = `${this.fieldWidth}x${this.fieldHeight}`;
    this.requestRender();
  }

  resizeFramebuffer(width, height) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }
  }

  cssColors() {
    const styles = getComputedStyle(document.documentElement);
    const color = (name, fallback) =>
      parseCssColor(styles.getPropertyValue(name), fallback);
    return {
      ground: color("--rhizome-ground", "#b7ebe6"),
      groundShadow: color("--rhizome-ground-shadow", "#738b98"),
      wall: color("--rhizome-wall", "#48112f"),
      sheath: color("--rhizome-sheath", "#160a18"),
      xylem: color("--rhizome-xylem", "#ff26bd"),
      xylemCore: color("--rhizome-xylem-core", "#d7fffb"),
      structureBg: color("--rhizome-structure-bg", "#f4f2ea"),
      structureInk: color("--rhizome-structure-ink", "#080808"),
      blockBackground: color("--rhizome-block-background", "#000000"),
      blockAccent: color("--rhizome-block-accent", "#0ef928"),
      ink: color("--ink", "#080808"),
      paper: color("--paper", "#fbfbf8")
    };
  }

  bindQuad(program, position) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  requestRender() {
    if (this.contextLost || this.destroyed) return;
    this.needsRender = true;
    if (!this.frameHandle) {
      this.frameHandle = window.requestAnimationFrame(this.onAnimationFrame);
    }
  }

  onAnimationFrame(timestamp) {
    this.frameHandle = 0;
    if (this.contextLost || this.destroyed) return;
    const animated = this.shouldAnimate();
    const frameDue = timestamp - this.lastRenderTime >= FRAME_INTERVAL - 1;
    if (this.needsRender || (animated && frameDue)) {
      this.needsRender = false;
      this.lastRenderTime = timestamp;
      this.render(timestamp);
    }
    if (animated || this.needsRender) {
      this.frameHandle = window.requestAnimationFrame(this.onAnimationFrame);
    }
  }

  render(timestamp = performance.now()) {
    if (!this.gl || !this.fieldProgram || !this.compositeProgram) return;
    const gl = this.gl;
    const colors = this.colors || (this.colors = this.cssColors());
    const field = this.fieldUniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.fieldWidth, this.fieldHeight);
    this.bindQuad(this.fieldProgram, this.fieldPosition);
    gl.uniform2f(field.u_resolution, this.fieldWidth, this.fieldHeight);
    gl.uniform2f(field.u_pointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(field.u_pointer_active, this.pointer.active ? 1 : 0);
    gl.uniform1f(field.u_seed, this.seed % 1000000);
    gl.uniform1f(field.u_cell_scale, this.settings.cellScale);
    gl.uniform1f(field.u_irregularity, this.settings.irregularity);
    gl.uniform1f(field.u_wall_width, this.settings.wallWidth);
    gl.uniform1f(field.u_bundle_count, this.bundles.length);
    gl.uniform1f(field.u_bundle_scale, this.settings.bundleScale);
    gl.uniform1f(field.u_stain, this.settings.stain);
    gl.uniform1f(field.u_structure, this.view === "structure" ? 1 : 0);
    gl.uniform1f(
      field.u_time,
      this.reducedMotion.matches ? 0 : timestamp * 0.001
    );
    gl.uniform4fv(field["u_bundles[0]"], this.bundleData);
    gl.uniform1fv(field["u_bundle_angles[0]"], this.bundleAngles);
    gl.uniform1fv(field["u_bundle_channels[0]"], this.bundleChannels);

    let disperseProgress = 0;
    let disperseBundle = null;
    if (this.dispersal && !this.reducedMotion.matches) {
      disperseProgress = clamp(
        (timestamp - this.dispersal.startedAt) / (DISPERSAL_SECONDS * 1000),
        0,
        1
      );
      disperseBundle = this.dispersal.bundle;
      if (disperseProgress >= 1) this.dispersal = null;
    }
    gl.uniform4f(
      field.u_disperse_bundle,
      disperseBundle?.x ?? 0,
      disperseBundle?.y ?? 0,
      disperseBundle?.axisX ?? 1,
      disperseBundle?.axisY ?? 1
    );
    gl.uniform1f(field.u_disperse_angle, disperseBundle?.angle ?? 0);
    gl.uniform1f(field.u_disperse_channel, disperseBundle?.channel ?? 0);
    gl.uniform1f(field.u_disperse_progress, disperseProgress);
    gl.uniform1f(field.u_disperse_active, disperseBundle ? 1 : 0);
    gl.uniform3fv(field.u_ground, colors.ground);
    gl.uniform3fv(field.u_ground_shadow, colors.groundShadow);
    gl.uniform3fv(field.u_wall, colors.wall);
    gl.uniform3fv(field.u_sheath, colors.sheath);
    gl.uniform3fv(field.u_xylem, colors.xylem);
    gl.uniform3fv(field.u_xylem_core, colors.xylemCore);
    gl.uniform3fv(field.u_structure_bg, colors.structureBg);
    gl.uniform3fv(field.u_structure_ink, colors.structureInk);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const composite = this.compositeUniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.bindQuad(this.compositeProgram, this.compositePosition);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.uniform1i(composite.u_field, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTexture);
    gl.uniform1i(composite.u_glyph_atlas, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.blockGlyphTexture);
    gl.uniform1i(composite.u_block_atlas, 2);
    gl.uniform2f(composite.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(composite.u_view, VIEW_INDEX[this.view] ?? 0);
    gl.uniform1f(
      composite.u_glyph_size,
      this.settings.glyphSize * this.pixelScale
    );
    gl.uniform1f(
      composite.u_block_pitch,
      this.blockAtlas?.tileSize || Math.max(8, this.settings.glyphSize * this.pixelScale)
    );
    gl.uniform1f(composite.u_dither, this.settings.dither);
    gl.uniform1f(composite.u_ascii_blend, this.settings.asciiBlend);
    gl.uniform1f(
      composite.u_glyph_monochrome,
      this.settings.glyphColor === "monochrome" ? 1 : 0
    );
    gl.uniform3fv(composite.u_ink, colors.ink);
    gl.uniform3fv(composite.u_paper, colors.paper);
    gl.uniform4fv(
      composite.u_block_levels,
      this.blockAtlas?.levels || [0, 0.34, 0.67, 1]
    );
    gl.uniform3fv(composite.u_block_background, colors.blockBackground);
    gl.uniform3fv(composite.u_block_accent, colors.blockAccent);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.renderCount += 1;
    if (this.renderCount === 1 || this.renderCount % 30 === 0) {
      this.root.dataset.renderCount = String(this.renderCount);
    }
  }

  onContextLost(event) {
    event.preventDefault();
    this.contextLost = true;
    this.showFallback("WebGL context lost. The reference specimen is still available.");
  }

  onContextRestored() {
    try {
      this.contextLost = false;
      this.createResources();
      this.updateGlyphAtlas();
      this.updateBlockGlyphAtlas();
      this.root.dataset.state = "ready";
      this.fallback?.setAttribute("aria-hidden", "true");
      this.onResize();
      this.announce("WebGL context restored.");
    } catch (error) {
      console.error("[rhizome-field]", error);
      this.showFallback("WebGL could not be restored. Showing the reference specimen.");
    }
  }

  showFallback(message) {
    this.root.dataset.state = "fallback";
    this.fallback?.removeAttribute("aria-hidden");
    this.announce(message);
  }

  announce(message) {
    if (this.status) this.status.textContent = message;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frameHandle) window.cancelAnimationFrame(this.frameHandle);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.form?.removeEventListener("input", this.onInput);
    this.form?.removeEventListener("change", this.onInput);
    this.form?.removeEventListener("reset", this.onReset);
    this.canvas?.removeEventListener("pointermove", this.onPointerMove);
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas?.removeEventListener("pointerup", this.onPointerUp);
    this.canvas?.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas?.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas?.removeEventListener("keydown", this.onKeyDown);
    this.canvas?.removeEventListener("focus", this.onFocus);
    this.canvas?.removeEventListener("blur", this.onBlur);
    this.canvas?.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas?.removeEventListener("webglcontextrestored", this.onContextRestored);
    window.removeEventListener("themechange", this.onThemeChange);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.reducedMotion?.removeEventListener?.("change", this.onMotionChange);
    this.deleteResources();
  }
}

const initializeRhizomeFields = () => {
  document.querySelectorAll("[data-rhizome-field]").forEach((root) => {
    if (!(root instanceof HTMLElement) || root.dataset.rhizomeInitialized) return;
    root.dataset.rhizomeInitialized = "true";
    try {
      new RhizomeField(root);
    } catch (error) {
      console.error("[rhizome-field]", error);
      root.dataset.state = "fallback";
      const fallback = root.querySelector("[data-rhizome-fallback]");
      fallback?.removeAttribute("aria-hidden");
      const status = root.querySelector("[data-rhizome-status]");
      if (status) {
        status.textContent =
          "The GPU specimen could not start. Showing the reference microscope image.";
      }
    }
  });
};

initializeRhizomeFields();
document.addEventListener("astro:page-load", initializeRhizomeFields);
