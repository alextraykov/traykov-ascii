export const blocktypeMaterialGlsl = `
float blocktypeHash21(vec2 point) {
  vec3 p = fract(vec3(point.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float blocktypeSampleGlyph(
  sampler2D atlas,
  float blockIndex,
  vec2 cellUv
) {
  vec2 atlasUv = vec2((blockIndex + cellUv.x) * 0.25, cellUv.y);
  return texture2D(atlas, atlasUv).a;
}

float blocktypeBayer4(vec2 cell) {
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

float blocktypeQuantize(
  float tone,
  float threshold,
  vec4 glyphLevels
) {
  float safeTone = clamp(tone, 0.0, 1.0);
  float lowerLevel = 0.0;
  float upperLevel = max(0.0001, glyphLevels.y);
  float lowerIndex = 0.0;
  float upperIndex = 1.0;

  if (safeTone >= glyphLevels.z) {
    lowerLevel = glyphLevels.z;
    upperLevel = max(lowerLevel + 0.0001, glyphLevels.w);
    lowerIndex = 2.0;
    upperIndex = 3.0;
  } else if (safeTone >= glyphLevels.y) {
    lowerLevel = glyphLevels.y;
    upperLevel = max(lowerLevel + 0.0001, glyphLevels.z);
    lowerIndex = 1.0;
    upperIndex = 2.0;
  }

  float blend = (safeTone - lowerLevel) / (upperLevel - lowerLevel);
  return mix(lowerIndex, upperIndex, step(threshold, blend));
}
`;
