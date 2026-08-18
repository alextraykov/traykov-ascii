import { blocktypeMaterialGlsl } from "../shared/blocktype-material.js";
import { gerstnerFieldGlsl } from "../shared/gerstner-field.js";

export const cemeteryPlaneVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const noiseGlsl = `
float hash21(vec2 point) {
  vec3 p = fract(vec3(point.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), curve.x),
    mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + 1.0), curve.x),
    curve.y
  );
}

float fbm(vec2 point) {
  float sum = 0.0;
  float amplitude = 0.55;
  for (int octave = 0; octave < 4; octave++) {
    sum += valueNoise(point) * amplitude;
    point = point * 2.03 + vec2(13.17, 7.31);
    amplitude *= 0.48;
  }
  return sum;
}
`;


export const cemeteryFogFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uMotion;
uniform float uSeed;
uniform float uFogAmount;
uniform float uFogSpeed;
uniform float uFogDensity;
uniform float uFogDepthContrast;
uniform float uWake;
uniform vec2 uPointer;
uniform vec2 uPointerVelocity;
uniform vec2 uCrop;
uniform vec3 uFogRear;
uniform vec3 uFogMiddle;
uniform vec3 uFogNear;

${noiseGlsl}

float broadFogMass(
  vec2 sceneUv,
  vec3 band,
  float velocity,
  float phase,
  float time,
  float depth
) {
  float drift = time * velocity * uFogSpeed;
  float longitudinal = (sceneUv.x - 0.5 + drift) * mix(1.18, 0.68, depth) + phase;
  float billow = fbm(vec2(longitudinal * 1.24 + phase * 19.0, phase * 13.7));
  float contour = (billow - 0.5) * band.y * 0.82;
  contour += sin(longitudinal * 2.2 + phase * 8.0) * band.y * 0.18;
  float width = band.y * mix(0.9, 1.62, fbm(vec2(longitudinal * 0.68 + 19.0, phase * 7.3)));
  float distance = abs(sceneUv.y - (band.x + contour)) / max(0.0001, width);
  float vertical = exp(-distance * distance * mix(0.74, 1.24, depth));
  float density = fbm(vec2(longitudinal * 1.86, sceneUv.y * 2.8 + phase * 11.0));
  float body = smoothstep(0.18, 0.74, density + (1.0 - distance) * 0.26);
  float lobe = mix(0.7, 1.0, valueNoise(vec2(longitudinal * 3.6, phase * 5.1)));
  return vertical * body * lobe * band.z;
}

void main() {
  vec2 sceneUv = vec2(uCrop.x + vUv.x * uCrop.y, 1.0 - vUv.y);
  float time = uTime * uMotion;

  vec2 pointerDelta = sceneUv - uPointer;
  pointerDelta.x /= max(0.35, uCrop.y);
  float wakeMask = exp(-dot(pointerDelta, pointerDelta) * 24.0) * uWake;
  vec2 nearUv = sceneUv;
  nearUv.x -= clamp(uPointerVelocity.x, -0.4, 0.4) * wakeMask * 0.004;

  float rear = broadFogMass(sceneUv, uFogRear, 0.034, uSeed + 0.17, time, 0.16);
  float middle = broadFogMass(sceneUv, uFogMiddle, -0.022, uSeed + 0.61, time, 0.52);
  float nearFog = broadFogMass(nearUv, uFogNear, 0.014, uSeed + 1.13, time, 0.9);
  float depthContrast = clamp(uFogDepthContrast, 0.0, 1.0);

  rear *= uFogAmount * uFogDensity * mix(0.88, 0.58, depthContrast);
  middle *= uFogAmount * uFogDensity * mix(0.94, 0.78, depthContrast);
  nearFog *= uFogAmount * uFogDensity * mix(1.0, 1.18, depthContrast);
  gl_FragColor = vec4(
    clamp(rear, 0.0, 1.0),
    clamp(middle, 0.0, 1.0),
    clamp(nearFog, 0.0, 1.0),
    clamp(nearFog, 0.0, 1.0)
  );
}
`;

export const cemeterySceneFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform sampler2D uFogTexture;
uniform float uTime;
uniform float uMotion;
uniform float uSeed;
uniform float uTerrainLight;
uniform float uMoonIntensity;
uniform float uSkyDepth;
uniform float uParallax;
uniform float uTerrainParallax;
uniform float uCloudScale;
uniform float uCloudAmplitude;
uniform float uCloudCrest;
uniform float uCloudSpeed;
uniform float uCloudAngle;
uniform vec2 uCloudWorld;
uniform vec3 uCloudLayerScale;
uniform vec3 uCloudLayerTime;
uniform vec3 uCloudPhase;
uniform vec3 uCloudKeyLight;
uniform float uDebugView;
uniform vec4 uProceduralGraveMask;
uniform float uProceduralGraveFive;
uniform vec4 uShadowProjection;
uniform float uShadowSoftness;
uniform float uShadowOpacity;
uniform float uSceneAspect;
uniform vec2 uPointer;
uniform vec2 uCrop;
uniform vec3 uMoon;
uniform vec3 uSkyColor;
uniform vec3 uCloudColor;
uniform vec3 uTerrainColor;
uniform vec3 uPathColor;
uniform vec3 uHeadstoneColor;
uniform vec3 uRearFogColor;
uniform vec3 uMiddleFogColor;
uniform vec3 uMoonColor;
uniform vec3 uMoonHaloColor;

${noiseGlsl}
${gerstnerFieldGlsl}

float sdBox(vec2 point, vec2 halfSize) {
  vec2 distance = abs(point) - halfSize;
  return length(max(distance, 0.0)) + min(max(distance.x, distance.y), 0.0);
}

float graveShape(vec2 uv, vec2 center, vec2 size, float lean) {
  vec2 point = uv - center;
  point.x += point.y * lean;
  float body = step(abs(point.x), size.x) * step(-size.y, point.y) * step(point.y, size.y * 0.48);
  float crown = step(length(vec2(point.x, point.y + size.y * 0.46)), size.x);
  float erode = valueNoise(point * 190.0 + center * 83.0) * 0.006;
  float silhouette = max(body, crown);
  silhouette *= step(erode, 0.0052 + size.x * 0.05);
  return silhouette;
}

float graveField(vec2 uv) {
  float field = 0.0;
  field = max(field, graveShape(uv, vec2(0.32, 0.59), vec2(0.018, 0.046), -0.06) * uProceduralGraveMask.x);
  field = max(field, graveShape(uv, vec2(0.40, 0.68), vec2(0.027, 0.07), 0.05) * uProceduralGraveMask.y);
  field = max(field, graveShape(uv, vec2(0.69, 0.66), vec2(0.03, 0.078), -0.04) * uProceduralGraveMask.z);
  field = max(field, graveShape(uv, vec2(0.58, 0.86), vec2(0.034, 0.082), 0.1) * uProceduralGraveMask.w);
  field = max(field, graveShape(uv, vec2(0.77, 0.80), vec2(0.022, 0.058), -0.08) * uProceduralGraveFive);
  return field;
}

float graveShadow(vec2 uv, vec2 center, vec2 size) {
  vec2 direction = normalize(uShadowProjection.xy);
  vec2 base = center + vec2(0.0, size.y * 0.42);
  vec2 point = uv - base;
  float along = dot(point, direction);
  float across = abs(dot(point, vec2(-direction.y, direction.x)));
  float progress = clamp(along / max(0.0001, uShadowProjection.z), 0.0, 1.0);
  float width = mix(size.x * 0.95 + uShadowProjection.w, size.x * 0.22 + uShadowProjection.w, progress);
  float start = smoothstep(-uShadowSoftness, uShadowSoftness, along);
  float end = 1.0 - smoothstep(
    uShadowProjection.z - uShadowSoftness,
    uShadowProjection.z + uShadowSoftness,
    along
  );
  float lobe = 1.0 - smoothstep(width, width + uShadowSoftness, across);
  return start * end * lobe * mix(1.0, 0.42, progress);
}

float graveShadowField(vec2 uv) {
  float field = 0.0;
  field = max(field, graveShadow(uv, vec2(0.32, 0.59), vec2(0.018, 0.046)));
  field = max(field, graveShadow(uv, vec2(0.40, 0.68), vec2(0.027, 0.07)));
  field = max(field, graveShadow(uv, vec2(0.69, 0.66), vec2(0.03, 0.078)));
  field = max(field, graveShadow(uv, vec2(0.58, 0.86), vec2(0.034, 0.082)));
  field = max(field, graveShadow(uv, vec2(0.77, 0.80), vec2(0.022, 0.058)));
  return field;
}

float pathField(vec2 uv, out float edgeLight) {
  float path = 0.0;
  edgeLight = 0.0;
  for (int index = 0; index < 24; index++) {
    float fi = float(index);
    float t = fi / 23.0;
    float shaped = pow(t, 0.86);
    vec2 center = vec2(
      mix(0.34, 0.60, shaped) + sin(t * 3.14159265) * 0.052 + (hash21(vec2(fi, uSeed)) - 0.5) * 0.012,
      mix(1.02, 0.46, shaped) + (hash21(vec2(uSeed, fi)) - 0.5) * mix(0.014, 0.004, t)
    );
    vec2 halfSize = vec2(
      mix(0.074, 0.019, t) * mix(0.82, 1.16, hash21(vec2(fi, 9.1))),
      mix(0.014, 0.0045, t)
    );
    vec2 point = uv - center;
    point.x += sin(fi * 1.73) * point.y * 0.26;
    float distance = sdBox(point, halfSize);
    float stone = 1.0 - smoothstep(-0.001, 0.003, distance + (valueNoise(point * 260.0 + fi) - 0.5) * 0.004);
    path = max(path, stone);
    float upperEdge = stone * smoothstep(halfSize.y * 0.18, halfSize.y, -point.y);
    edgeLight = max(edgeLight, upperEdge * step(0.42, hash21(vec2(fi, 71.0))));
  }
  return path;
}

void main() {
  vec2 sceneUv = vec2(uCrop.x + vUv.x * uCrop.y, 1.0 - vUv.y);
  vec2 terrainOffset = (uPointer - 0.5) * uParallax * uTerrainParallax;
  vec2 hillUv = sceneUv - terrainOffset;
  float macro = valueNoise(vec2(hillUv.x * 1.2 + uSeed, 2.3));
  float hillTop = 0.45 + pow(abs(hillUv.x - 0.60), 1.35) * 0.86 + (macro - 0.5) * 0.055;
  float hill = smoothstep(hillTop - 0.008, hillTop + 0.012, hillUv.y);
  float skyMask = 1.0 - hill;

  vec2 skyUv = sceneUv - terrainOffset * 0.2;
  vec2 ceilingUv = vec2(skyUv.x, 1.0 - skyUv.y);
  float ceilingPerspective = 1.0 / mix(1.0, 0.22, ceilingUv.y);
  vec2 cloudWorld = vec2(
    (ceilingUv.x - 0.5) * uSceneAspect * uCloudWorld.x * ceilingPerspective,
    ceilingUv.y * uCloudWorld.y * ceilingPerspective
  ) * uCloudScale;
  float cloudCos = cos(uCloudAngle);
  float cloudSin = sin(uCloudAngle);
  cloudWorld = vec2(
    cloudWorld.x * cloudCos - cloudWorld.y * cloudSin,
    cloudWorld.x * cloudSin + cloudWorld.y * cloudCos
  );
  vec2 rearGradient;
  vec2 middleGradient;
  vec2 lowerGradient;
  float rearWave = gerstnerSixWaveField(
    cloudWorld * uCloudLayerScale.x,
    uCloudAmplitude,
    uCloudCrest,
    uTime,
    uMotion,
    uCloudSpeed * uCloudLayerTime.x,
    uSeed + uCloudPhase.x,
    rearGradient
  );
  float middleWave = gerstnerSixWaveField(
    cloudWorld * uCloudLayerScale.y + vec2(11.7, 3.1),
    uCloudAmplitude,
    uCloudCrest,
    uTime,
    uMotion,
    uCloudSpeed * uCloudLayerTime.y,
    uSeed + uCloudPhase.y,
    middleGradient
  );
  float lowerWave = gerstnerSixWaveField(
    cloudWorld * uCloudLayerScale.z + vec2(23.4, 7.9),
    uCloudAmplitude,
    uCloudCrest,
    uTime,
    uMotion,
    uCloudSpeed * uCloudLayerTime.z,
    uSeed + uCloudPhase.z,
    lowerGradient
  );
  float cloudHeight = rearWave * 0.52 + middleWave * 0.31 + lowerWave * 0.17;
  vec2 cloudGradient = rearGradient * 0.52 + middleGradient * 0.31 + lowerGradient * 0.17;
  vec3 cloudNormal = normalize(
    vec3(
      -cloudGradient.x * (0.11 + uCloudCrest * 0.08),
      1.0,
      -cloudGradient.y * (0.11 + uCloudCrest * 0.08)
    )
  );
  vec3 cloudLightDirection = normalize(uCloudKeyLight);
  vec3 cloudViewDirection = normalize(
    vec3(
      (0.5 - skyUv.x) * uSceneAspect * 0.16,
      0.72 + skyUv.y * 0.18,
      0.68
    )
  );
  vec3 cloudHalfDirection = normalize(cloudLightDirection + cloudViewDirection);
  float cloudDiffuse = clamp(dot(cloudNormal, cloudLightDirection) * 0.5 + 0.5, 0.0, 1.0);
  float cloudSpecular = pow(
    max(0.0, dot(cloudNormal, cloudHalfDirection)),
    mix(32.0, 76.0, uCloudCrest)
  );
  float cloudFacing = max(0.0, dot(cloudNormal, cloudViewDirection));
  float cloudFresnel = pow(1.0 - cloudFacing, 5.0);
  float cloudReflection = mix(0.14, 0.52, cloudFresnel);
  float cloudCrest = smoothstep(uCloudAmplitude * 0.07, uCloudAmplitude * 0.44, cloudHeight);
  float cloudHighCrest = smoothstep(uCloudAmplitude * 0.36, uCloudAmplitude * 0.78, cloudHeight);
  float cloudTrough = smoothstep(uCloudAmplitude * 0.08, uCloudAmplitude * 0.5, -cloudHeight);
  float cloudSlope = length(cloudGradient) * (0.08 + uCloudCrest * 0.06);
  float crestCompression = smoothstep(0.48, 1.28, cloudSlope);
  float upperRightCrest =
    smoothstep(0.36, 0.98, skyUv.x) *
    (1.0 - smoothstep(0.12, 0.52, skyUv.y));
  float cloudCoverage = smoothstep(
    -uCloudAmplitude * 0.42,
    uCloudAmplitude * 0.38,
    cloudHeight
  );
  float cloudTone =
    0.003 +
    cloudReflection * 0.038 +
    cloudDiffuse * 0.03 +
    cloudCrest * 0.14 +
    cloudSpecular * 0.24 +
    cloudHighCrest * crestCompression * mix(0.1, 0.28, upperRightCrest);
  cloudTone *= cloudCoverage;
  cloudTone *= 1.0 - cloudTrough * 0.985;
  cloudTone = pow(clamp(cloudTone, 0.0, 1.0), 0.72);
  cloudTone *= mix(1.72, 2.36, upperRightCrest);
  float hillFade = smoothstep(0.0, 0.17, skyMask);
  vec3 skyColor =
    (uSkyColor * 0.004 * cloudCoverage + uCloudColor * cloudTone) *
    uSkyDepth *
    hillFade;

  vec2 moonPoint = vec2(
    (sceneUv.x - uMoon.x) * uSceneAspect,
    sceneUv.y - uMoon.y
  );
  float moonDistance = length(moonPoint);
  float moonDisk = 1.0 - smoothstep(uMoon.z - 0.0025, uMoon.z + 0.0025, moonDistance);
  vec2 moonLocal = moonPoint / max(0.0001, uMoon.z);
  float crater = fbm(moonLocal * 3.4 + vec2(31.0, 17.0));
  float terminator = smoothstep(-0.58, 0.34, moonLocal.x + (crater - 0.5) * 0.12);
  float limb = 1.0 - smoothstep(0.68, 1.0, length(moonLocal));
  float moonSurface = moonDisk * terminator * (0.15 + crater * 0.14 + limb * 0.045);
  float moonRim = moonDisk * terminator * smoothstep(0.92, 0.985, crater) * limb * 0.026;
  float moonHalo = exp(-max(0.0, moonDistance - uMoon.z) * 36.0) * (1.0 - moonDisk) * 0.018;
  float moonOcclusion = 1.0 - cloudCoverage * mix(0.16, 0.34, cloudHighCrest);
  skyColor += uMoonColor * (moonSurface + moonRim) * uMoonIntensity * skyMask * moonOcclusion;
  skyColor += uMoonHaloColor * moonHalo * uMoonIntensity * skyMask * mix(1.0, moonOcclusion, 0.52);

  float moonLight = exp(-length((sceneUv - vec2(uMoon.x, 0.39)) * vec2(1.1, 1.58)) * 5.1) * uMoonIntensity;
  float surface =
    valueNoise(hillUv * vec2(6.0, 7.0) + 31.0) * 0.66 +
    valueNoise(hillUv * vec2(28.0, 34.0) + 73.0) * 0.22 +
    valueNoise(hillUv * vec2(76.0, 92.0) + 109.0) * 0.06;
  float terrainLight = hill * moonLight * (0.04 + surface * 0.13) * uTerrainLight;
  terrainLight += hill * (1.0 - smoothstep(hillTop - 0.008, hillTop + 0.015, hillUv.y)) * 0.022;

  float pathEdge = 0.0;
  float path = pathField(sceneUv - terrainOffset * 1.2, pathEdge);
  float graves = graveField(sceneUv - terrainOffset);
  float groundShadow = graveShadowField(sceneUv - terrainOffset) * hill;
  vec4 fog = texture2D(uFogTexture, vUv);
  float rearFog = fog.r;
  float middleFog = fog.g;
  float nearFog = fog.b;
  float lighting = clamp(
    moonSurface + moonRim + moonHalo + moonLight * 0.2 + terrainLight + pathEdge * 0.24 - groundShadow * uShadowOpacity,
    0.0,
    1.0
  );

  vec3 color = skyColor;
  color = mix(color, uTerrainColor * (0.12 + terrainLight * 2.4), hill);
  color = mix(color, uPathColor * (0.22 + pathEdge * 0.72), path * hill);
  color *= 1.0 - groundShadow * uShadowOpacity;
  color = mix(color, uRearFogColor, rearFog * 0.52);
  float middleAroundGraves = middleFog * (1.0 - graves * 0.82);
  color = mix(color, uMiddleFogColor, middleAroundGraves * 0.48);
  color = mix(color, uHeadstoneColor * (0.22 + moonLight * 0.2), graves);

  float vignette = 1.0 - smoothstep(0.48, 1.05, length((sceneUv - vec2(0.63, 0.55)) * vec2(0.82, 1.0)));
  float leftVoid = mix(0.24, 1.0, smoothstep(0.05, 0.5, sceneUv.x + sceneUv.y * 0.14));
  color *= vignette * leftVoid;

  if (uDebugView > 1.5 && uDebugView < 2.5) {
    color = vec3(clamp(terrainLight * 3.0 + path * 0.23 + graves * 0.18, 0.0, 1.0));
  } else if (uDebugView > 2.5 && uDebugView < 3.5) {
    color = vec3(clamp(rearFog * 0.44 + middleFog * 0.62 + nearFog * 0.82, 0.0, 1.0));
  } else if (uDebugView > 3.5 && uDebugView < 4.5) {
    color = clamp(skyColor, 0.0, 1.0);
  } else if (uDebugView > 4.5 && uDebugView < 5.5) {
    color = vec3(lighting);
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const cemeteryFogOverlayFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform sampler2D uFogTexture;
uniform float uFogAmount;
uniform float uFogDepthContrast;
uniform vec3 uFogColor;

void main() {
  float nearFog = texture2D(uFogTexture, vUv).b;
  float amount = mix(0.09, 0.16, clamp(uFogAmount / 1.5, 0.0, 1.0));
  amount *= mix(0.82, 1.12, clamp(uFogDepthContrast, 0.0, 1.0));
  gl_FragColor = vec4(uFogColor, nearFog * amount);
}
`;

export const cemeteryCompositeFragmentShader = `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSceneTexture;
uniform sampler2D uGlyphAtlas;
uniform vec2 uResolution;
uniform vec4 uGlyphLevels;
uniform float uPitch;
uniform float uSeed;
uniform float uVariation;
uniform float uViewMode;
uniform float uBlackPoint;
uniform float uWhitePoint;
uniform float uToneCurve;
uniform vec3 uBackground;
uniform vec3 uGlyphDark;
uniform vec3 uGlyphLight;
uniform vec3 uGlyphHighlight;

${blocktypeMaterialGlsl}

float cemeteryLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  if (uViewMode < 5.5) {
    gl_FragColor = texture2D(uSceneTexture, vUv);
    return;
  }

  vec2 cell = floor(gl_FragCoord.xy / uPitch);
  vec2 cellUv = fract(gl_FragCoord.xy / uPitch);
  vec2 sampleUv = ((cell + 0.5) * uPitch) / uResolution;
  vec2 capture = vec2(uPitch * 0.25) / uResolution;
  vec3 sourceColor = texture2D(uSceneTexture, clamp(sampleUv, 0.0, 1.0)).rgb;
  float sourceLum = cemeteryLuminance(sourceColor);
  vec3 candidateColor = texture2D(uSceneTexture, clamp(sampleUv + vec2(capture.x, 0.0), 0.0, 1.0)).rgb;
  float candidateLum = cemeteryLuminance(candidateColor);
  if (candidateLum > sourceLum) {
    sourceColor = candidateColor;
    sourceLum = candidateLum;
  }
  candidateColor = texture2D(uSceneTexture, clamp(sampleUv - vec2(capture.x, 0.0), 0.0, 1.0)).rgb;
  candidateLum = cemeteryLuminance(candidateColor);
  if (candidateLum > sourceLum) {
    sourceColor = candidateColor;
    sourceLum = candidateLum;
  }
  candidateColor = texture2D(uSceneTexture, clamp(sampleUv + vec2(0.0, capture.y), 0.0, 1.0)).rgb;
  candidateLum = cemeteryLuminance(candidateColor);
  if (candidateLum > sourceLum) {
    sourceColor = candidateColor;
    sourceLum = candidateLum;
  }
  candidateColor = texture2D(uSceneTexture, clamp(sampleUv - vec2(0.0, capture.y), 0.0, 1.0)).rgb;
  candidateLum = cemeteryLuminance(candidateColor);
  if (candidateLum > sourceLum) {
    sourceColor = candidateColor;
    sourceLum = candidateLum;
  }
  float tone = clamp(
    (sourceLum - uBlackPoint) / max(0.0001, uWhitePoint - uBlackPoint),
    0.0,
    1.0
  );
  tone = pow(tone, uToneCurve);

  float ordered = blocktypeBayer4(cell);
  float stable = blocktypeHash21(floor(cell / 4.0) + vec2(uSeed * 37.0, uSeed * 53.0));
  float threshold = clamp(mix(ordered, stable, uVariation), 0.02, 0.98);
  float blockIndex = blocktypeQuantize(tone, threshold, uGlyphLevels);
  float glyphAlpha = blocktypeSampleGlyph(uGlyphAtlas, blockIndex, cellUv);
  float blockMix = blockIndex / 3.0;
  float glyphInk = cemeteryLuminance(
    mix(uGlyphDark, uGlyphLight, smoothstep(0.0, 0.78, blockMix))
  );
  glyphInk = mix(
    glyphInk,
    cemeteryLuminance(uGlyphHighlight),
    smoothstep(0.78, 1.0, tone)
  );
  vec3 glyphColor = vec3(glyphInk);
  vec3 color = mix(uBackground, glyphColor, glyphAlpha);
  gl_FragColor = vec4(color, 1.0);
}
`;
