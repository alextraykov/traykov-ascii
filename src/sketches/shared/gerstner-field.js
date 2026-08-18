// Shared six-wave field used by the blocktype water sketch and the cemetery
// sky. Keep the directions, wave lengths, amplitude weights, and phase offsets
// in one place so the two surfaces remain the same deterministic field.
export const gerstnerFieldGlsl = `
const float GERSTNER_TAU = 6.28318530718;

void gerstnerAddWave(
  vec2 point,
  vec2 direction,
  float wavelength,
  float waveAmplitude,
  float phaseOffset,
  float steepness,
  float time,
  float motion,
  float speed,
  inout float height,
  inout vec2 gradient
) {
  vec2 unitDirection = normalize(direction);
  float waveNumber = GERSTNER_TAU / max(0.08, wavelength);
  float phaseSpeed = sqrt(9.8 * waveNumber);
  float phase =
    waveNumber * dot(unitDirection, point) -
    time * motion * speed * phaseSpeed +
    phaseOffset;

  float crestBias = steepness * 0.28;
  float trochoidalPhase = phase + cos(phase) * crestBias;
  float phaseDerivative = 1.0 - sin(phase) * crestBias;
  float primary = sin(trochoidalPhase);
  float harmonic = sin(trochoidalPhase * 2.0);
  float shape = primary + harmonic * steepness * 0.08;
  float derivative =
    (
      cos(trochoidalPhase) +
      cos(trochoidalPhase * 2.0) * steepness * 0.16
    ) *
    phaseDerivative;

  height += shape * waveAmplitude;
  gradient +=
    unitDirection *
    derivative *
    waveAmplitude *
    waveNumber;
}

float gerstnerSixWaveField(
  vec2 point,
  float amplitude,
  float steepness,
  float time,
  float motion,
  float speed,
  float seed,
  out vec2 gradient
) {
  float height = 0.0;
  gradient = vec2(0.0);
  float seedPhase = seed * GERSTNER_TAU;

  gerstnerAddWave(
    point,
    vec2(0.22, 1.0),
    4.2,
    amplitude * 0.48,
    seedPhase,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );
  gerstnerAddWave(
    point,
    vec2(-0.18, 1.0),
    2.65,
    amplitude * 0.25,
    seedPhase * 1.73 + 1.4,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );
  gerstnerAddWave(
    point,
    vec2(0.52, 0.85),
    1.55,
    amplitude * 0.14,
    seedPhase * 2.31 + 3.1,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );
  gerstnerAddWave(
    point,
    vec2(-0.46, 0.9),
    0.92,
    amplitude * 0.075,
    seedPhase * 3.07 + 4.7,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );
  gerstnerAddWave(
    point,
    vec2(0.38, 1.0),
    0.58,
    amplitude * 0.035,
    seedPhase * 4.11 + 0.8,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );
  gerstnerAddWave(
    point,
    vec2(-0.62, 0.78),
    0.36,
    amplitude * 0.02,
    seedPhase * 5.17 + 2.6,
    steepness,
    time,
    motion,
    speed,
    height,
    gradient
  );

  return height;
}
`;
