export const blocktypeVertexShader = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const blocktypeFragmentShader = `
precision highp float;

uniform sampler2D u_glyph_atlas;
uniform vec2 u_resolution;
uniform vec2 u_pointer_uv;
uniform vec4 u_glyph_levels;
uniform float u_pitch;
uniform float u_time;
uniform float u_motion;
uniform float u_pointer_inside;
uniform float u_wave_scale;
uniform float u_amplitude;
uniform float u_steepness;
uniform float u_speed;
uniform float u_contrast;
uniform float u_seed;
uniform vec3 u_background;
uniform vec3 u_wave_dark;
uniform vec3 u_wave_light;
uniform vec3 u_foam;

const float TAU = 6.28318530718;

float hash21(vec2 point) {
  vec3 p = fract(vec3(point.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float sampleGlyph(float blockIndex, vec2 cellUv) {
  vec2 atlasUv = vec2(
    (blockIndex + cellUv.x) * 0.25,
    cellUv.y
  );
  return texture2D(u_glyph_atlas, atlasUv).a;
}

float bayer4(vec2 cell) {
  vec2 p = mod(cell, 4.0);

  if (p.y < 1.0) {
    if (p.x < 1.0) return 0.0 / 16.0;
    if (p.x < 2.0) return 8.0 / 16.0;
    if (p.x < 3.0) return 2.0 / 16.0;
    return 10.0 / 16.0;
  }

  if (p.y < 2.0) {
    if (p.x < 1.0) return 12.0 / 16.0;
    if (p.x < 2.0) return 4.0 / 16.0;
    if (p.x < 3.0) return 14.0 / 16.0;
    return 6.0 / 16.0;
  }

  if (p.y < 3.0) {
    if (p.x < 1.0) return 3.0 / 16.0;
    if (p.x < 2.0) return 11.0 / 16.0;
    if (p.x < 3.0) return 1.0 / 16.0;
    return 9.0 / 16.0;
  }

  if (p.x < 1.0) return 15.0 / 16.0;
  if (p.x < 2.0) return 7.0 / 16.0;
  if (p.x < 3.0) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

float quantizeBlocktype(float tone, float threshold) {
  float safeTone = clamp(tone, 0.0, 1.0);
  float lowerLevel = 0.0;
  float upperLevel = max(0.0001, u_glyph_levels.y);
  float lowerIndex = 0.0;
  float upperIndex = 1.0;

  if (safeTone >= u_glyph_levels.z) {
    lowerLevel = u_glyph_levels.z;
    upperLevel = max(lowerLevel + 0.0001, u_glyph_levels.w);
    lowerIndex = 2.0;
    upperIndex = 3.0;
  } else if (safeTone >= u_glyph_levels.y) {
    lowerLevel = u_glyph_levels.y;
    upperLevel = max(lowerLevel + 0.0001, u_glyph_levels.z);
    lowerIndex = 1.0;
    upperIndex = 2.0;
  }

  float blend = (safeTone - lowerLevel) / (upperLevel - lowerLevel);
  return mix(lowerIndex, upperIndex, step(threshold, blend));
}

void addWave(
  vec2 point,
  vec2 direction,
  float wavelength,
  float waveAmplitude,
  float phaseOffset,
  inout float height,
  inout vec2 gradient
) {
  vec2 unitDirection = normalize(direction);
  float waveNumber = TAU / max(0.08, wavelength);
  float phaseSpeed = sqrt(9.8 * waveNumber);
  float phase =
    waveNumber * dot(unitDirection, point) -
    u_time * u_motion * u_speed * phaseSpeed +
    phaseOffset;

  float crestBias = u_steepness * 0.28;
  float trochoidalPhase = phase + cos(phase) * crestBias;
  float phaseDerivative = 1.0 - sin(phase) * crestBias;
  float primary = sin(trochoidalPhase);
  float harmonic = sin(trochoidalPhase * 2.0);
  float shape = primary + harmonic * u_steepness * 0.08;
  float derivative =
    (
      cos(trochoidalPhase) +
      cos(trochoidalPhase * 2.0) * u_steepness * 0.16
    ) *
    phaseDerivative;

  height += shape * waveAmplitude;
  gradient +=
    unitDirection *
    derivative *
    waveAmplitude *
    waveNumber;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_pitch);
  vec2 cellUv = fract(gl_FragCoord.xy / u_pitch);
  vec2 samplePixel = (cell + 0.5) * u_pitch;
  vec2 uv = samplePixel / u_resolution;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);

  float perspective = 1.0 / mix(1.0, 0.2, uv.y);
  vec2 world = vec2(
    (uv.x - 0.5) * aspect * 5.2 * perspective,
    perspective * 3.6
  );
  world *= u_wave_scale;

  vec2 pointerDelta = uv - u_pointer_uv;
  pointerDelta.x *= aspect;
  float pointerDistance = length(pointerDelta);
  vec2 pointerDirection =
    pointerDelta / max(0.0001, pointerDistance);
  float pointerWake =
    sin(pointerDistance * 56.0 - u_time * u_motion * u_speed * 5.0) *
    exp(-pointerDistance * 16.0) *
    u_pointer_inside;

  world += pointerDirection * pointerWake * 0.035;

  float height = 0.0;
  vec2 gradient = vec2(0.0);
  float seedPhase = u_seed * TAU;

  addWave(
    world,
    vec2(0.22, 1.0),
    4.2,
    u_amplitude * 0.48,
    seedPhase,
    height,
    gradient
  );
  addWave(
    world,
    vec2(-0.18, 1.0),
    2.65,
    u_amplitude * 0.25,
    seedPhase * 1.73 + 1.4,
    height,
    gradient
  );
  addWave(
    world,
    vec2(0.52, 0.85),
    1.55,
    u_amplitude * 0.14,
    seedPhase * 2.31 + 3.1,
    height,
    gradient
  );
  addWave(
    world,
    vec2(-0.46, 0.9),
    0.92,
    u_amplitude * 0.075,
    seedPhase * 3.07 + 4.7,
    height,
    gradient
  );
  addWave(
    world,
    vec2(0.38, 1.0),
    0.58,
    u_amplitude * 0.035,
    seedPhase * 4.11 + 0.8,
    height,
    gradient
  );
  addWave(
    world,
    vec2(-0.62, 0.78),
    0.36,
    u_amplitude * 0.02,
    seedPhase * 5.17 + 2.6,
    height,
    gradient
  );

  height += pointerWake * u_amplitude * 0.1;

  vec3 normal = normalize(
    vec3(
      -gradient.x * (0.11 + u_steepness * 0.08),
      1.0,
      -gradient.y * (0.11 + u_steepness * 0.08)
    )
  );
  vec3 lightDirection = normalize(vec3(-0.4, 0.68, 0.62));
  vec3 viewDirection = normalize(
    vec3(
      (0.5 - uv.x) * aspect * 0.16,
      0.72 + uv.y * 0.18,
      0.68
    )
  );
  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float diffuse = clamp(dot(normal, lightDirection) * 0.5 + 0.5, 0.0, 1.0);
  float specular = pow(
    max(0.0, dot(normal, halfDirection)),
    mix(32.0, 76.0, u_steepness)
  );
  float facing = max(0.0, dot(normal, viewDirection));
  float fresnel = pow(1.0 - facing, 5.0);
  float reflection = mix(0.14, 0.52, fresnel);
  float crest = smoothstep(0.07, 0.44, height);
  float highCrest = smoothstep(0.36, 0.78, height);
  float trough = smoothstep(0.08, 0.5, -height);
  float slope = length(gradient) * (0.08 + u_steepness * 0.06);
  float compression = smoothstep(0.48, 1.28, slope);
  float foam = highCrest * compression;
  float horizon = smoothstep(0.03, 0.17, uv.y);

  float tone =
    0.024 +
    reflection * 0.36 +
    diffuse * 0.12 +
    crest * 0.3 +
    specular * 0.68 +
    foam * 0.54 -
    trough * 0.07;
  tone = smoothstep(0.06, 0.9, tone) * horizon;
  tone = pow(clamp(tone, 0.0, 1.0), max(0.15, u_contrast));

  float orderedThreshold = bayer4(cell);
  float stableVariation =
    hash21(floor(cell / 4.0) + vec2(u_seed * 37.0, u_seed * 53.0));
  float threshold =
    clamp(mix(orderedThreshold, stableVariation, 0.16), 0.02, 0.98);
  float foamMix = smoothstep(
    0.08,
    0.58,
    foam + highCrest * 0.28 + specular * 0.4
  );
  float blockIndex = quantizeBlocktype(tone, threshold);
  blockIndex = max(blockIndex, 3.0 * step(0.58, foamMix));
  float glyphAlpha = sampleGlyph(blockIndex, cellUv);
  float blockMix = blockIndex / 3.0;
  vec3 waveColor = mix(u_wave_dark, u_wave_light, blockMix);
  waveColor = mix(waveColor, u_foam, foamMix);
  vec3 color = mix(u_background, waveColor, glyphAlpha);

  gl_FragColor = vec4(color, 1.0);
}
`;
