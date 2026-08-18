import { blocktypeMaterialGlsl } from "../shared/blocktype-material.js";
import { gerstnerFieldGlsl } from "../shared/gerstner-field.js";

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

${blocktypeMaterialGlsl}
${gerstnerFieldGlsl}

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

  vec2 gradient;
  float height = gerstnerSixWaveField(
    world,
    u_amplitude,
    u_steepness,
    u_time,
    u_motion,
    u_speed,
    u_seed,
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

  float orderedThreshold = blocktypeBayer4(cell);
  float stableVariation =
    blocktypeHash21(floor(cell / 4.0) + vec2(u_seed * 37.0, u_seed * 53.0));
  float threshold =
    clamp(mix(orderedThreshold, stableVariation, 0.16), 0.02, 0.98);
  float foamMix = smoothstep(
    0.08,
    0.58,
    foam + highCrest * 0.28 + specular * 0.4
  );
  float blockIndex = blocktypeQuantize(tone, threshold, u_glyph_levels);
  blockIndex = max(blockIndex, 3.0 * step(0.58, foamMix));
  float glyphAlpha = blocktypeSampleGlyph(u_glyph_atlas, blockIndex, cellUv);
  float blockMix = blockIndex / 3.0;
  vec3 waveColor = mix(u_wave_dark, u_wave_light, blockMix);
  waveColor = mix(waveColor, u_foam, foamMix);
  vec3 color = mix(u_background, waveColor, glyphAlpha);

  gl_FragColor = vec4(color, 1.0);
}
`;
