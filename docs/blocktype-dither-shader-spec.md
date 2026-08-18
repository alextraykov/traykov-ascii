# Blocktype Dither Shader

Status: calibrated glyph material and analytic Gerstner wave interaction
implemented in the local sketchbook.

For a framework-neutral file list, mount example, approved preset, lifecycle,
performance rules, and transplant checklist, see
[blocktype-dither-reuse-guide.md](./blocktype-dither-reuse-guide.md).

This replaces the previous “block terminal LCD” direction. That sketch drew a
terminal-themed interface. This shader uses the Synapse block glyphs as the
image-forming material.

## 1. The object

A monochrome source field is sampled on a fixed character grid. Each character
cell can display exactly one of four states:

| Index | Cell | Meaning |
| --- | --- | --- |
| `0` | blank | off |
| `1` | `░` | light coverage |
| `2` | `▒` | medium coverage |
| `3` | `▓` | heavy coverage |

`█` is deliberately excluded. The production Synapse set is `░`, `▒`, and `▓`;
the empty cell supplies tone zero. Adding `█` would turn the brightest areas
into ordinary filled pixels and weaken the identity of the material.

The field should read at three distances:

1. From far away: a coherent tonal image.
2. At normal size: a stable four-tone ordered-dither field.
3. Up close: the literal Departure Mono shade glyphs on a visible cell pitch.

This is not a terminal illustration. The canvas contains no node cards, labels,
command syntax, borders, RGB subpixels, scanlines, bloom, or decorative
overlays.

## 2. What comes from Synapse

The shader retains only the parts of the block-terminal system that belong to
the material:

- the production glyphs `░`, `▒`, and `▓`;
- Departure Mono in the terminal palette;
- unequal glyph coverage as the tonal hierarchy;
- black plus one phosphor accent;
- stepped, finite state changes;
- motion that communicates a state transition and then stops.

The operation loaders remain motion references, not features to combine:

- `expand`: center-out reveal;
- `synthesize`: noise crystallizes into heavier blocks;
- `summarize`: blocks step backward toward empty;
- `compare`: neighboring regions alternate density.

Only `synthesize` informs the first pointer behavior. The others remain
separate future experiments.

## 3. Signal path

```text
source texture
→ one luminance sample per character cell
→ black point / white point / gamma
→ coverage-aware adjacent-level Bayer quantization
→ block index 0…3
→ Departure Mono glyph-atlas mask
→ one accent color over black
```

The compositor accepts a source texture and does not own the source:

```glsl
uniform sampler2D u_field;
```

This keeps it reusable for procedural fields, the existing Rhizome Field,
images, and later video inputs.

The source is sampled once at the center of each character cell. Every fragment
inside that cell therefore uses the same source value and block index; only the
glyph mask varies within the cell.

## 4. Glyph atlas and coverage

```js
const BLOCK_RAMP = [" ", "░", "▒", "▓"];
```

Wait for `Departure Mono Local` to load before rasterizing. JetBrains Mono may
be a failure fallback, but the material proof is not approved against the
fallback.

The production atlas is generated at the selected physical cell pitch:

```text
physical pitch = round(CSS pitch × device-pixel ratio)
tile size      = physical pitch × physical pitch
atlas size     = four tiles in one row
```

This creates a one-to-one relationship between atlas pixels and display pixels.
It avoids the unstable aliasing caused by shrinking a fixed 64 px glyph to many
smaller pitches with nearest-neighbor sampling.

Atlas rules:

- white glyph on transparent black;
- zero letter spacing;
- glyph centered from measured font bounds, not by a guessed baseline;
- `NEAREST` minification and magnification;
- no mipmaps;
- `CLAMP_TO_EDGE`;
- texels sampled at their centers;
- rebuild only when the font, physical pitch, or DPR changes.

### Measured coverage

Do not assume that the font produces exact 25%, 50%, and 75% masks. For every
tile, measure mean alpha across the entire cell:

```js
meanAlpha = sum(alpha / 255) / (tileWidth * tileHeight);
coverage = [0, meanLight, meanMid, meanHeavy];
```

Counting merely “nontransparent” pixels is incorrect because it discards
antialiasing and overstates partially covered edge pixels.

Normalize the measured levels against `▓`:

```js
levels = [
  0,
  meanLight / meanHeavy,
  meanMid / meanHeavy,
  1
];
```

This makes source white map to the heaviest available Synapse glyph without
pretending that `▓` is physically solid. Recalculate these values whenever the
atlas is rebuilt.

The atlas proof must report the measured values and fail visibly if they are
not strictly increasing.

## 5. Tone preparation

```glsl
float Y = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
Y = clamp(
  (Y - u_black_point) /
  max(0.0001, u_white_point - u_black_point),
  0.0,
  1.0
);
Y = pow(Y, u_gamma);
```

Initial controls:

| Control | Range | Default |
| --- | --- | --- |
| Character pitch | `8–24 CSS px` | `12 px` |
| Dither amount | `0–1` | `1` |
| Black point | `0–0.45` | `0.08` |
| White point | `0.55–1` | `0.92` |
| Gamma | `0.6–1.8` | `1` |
| Click strength | `1–2 levels` | `1 level` |

No presets are needed until the quantizer is visually correct.

## 6. Adjacent-level ordered dither

Arbitrary noise added to luminance is not acceptable. It biases the endpoints
and can jump over intermediate glyphs.

For tone `Y`, locate the two adjacent measured levels:

```text
lowerLevel ≤ Y ≤ upperLevel
```

Then calculate how far `Y` lies between them:

```glsl
float fraction =
  (Y - lowerLevel) /
  max(0.0001, upperLevel - lowerLevel);
```

The Bayer matrix uses the centered thresholds `(rank + 0.5) / 16`, never
`rank / 16`. Half-step centering prevents systematic dark and bright bias.

```glsl
float threshold = mix(0.5, bayer4(cell), u_dither);
float blockIndex = lowerIndex + step(threshold, fraction);
```

At `u_dither = 0`, the cell chooses the nearest measured glyph level. At
`u_dither = 1`, a 4×4 ordered pattern mixes only the two adjacent glyphs.

The Bayer matrix is anchored to integer character-cell coordinates, not
fragment coordinates or time. A static source must produce a completely static
pattern.

An 8×8 matrix is a later comparison, not an initial control.

## 7. Character pitch

The cell grid lives in physical canvas pixels:

```glsl
vec2 cell = floor(gl_FragCoord.xy / u_pitch_px);
vec2 cellPixel = mod(gl_FragCoord.xy, u_pitch_px);
```

Requirements:

- `u_pitch_px` is a whole physical-pixel value;
- source sampling uses the cell center;
- atlas lookup uses integer texel centers;
- the grid origin does not drift during resize;
- pointer coordinates use the same bottom-left orientation as `gl_FragCoord`;
- no smooth interpolation occurs between glyph masks;
- DPR is capped at `2` for predictable cost.

Pitch is part of the material, not a CSS grid drawn over the result.

## 8. Color

Current palette:

```text
background  #000000
wave dark   #262C29
wave light  #96A49A
foam        #F6F9F6
```

The final color is still defined by atlas alpha:

```glsl
vec3 color = mix(u_background, waveColor, glyphAlpha);
```

The continuous wave response chooses `waveColor`; the literal mask coverage
creates the final blocktype tone. Opacity multipliers, glow, and post-process
texture would double-encode the tone and reduce the glyphs to decorative
cutouts.

## 9. Rejected pointer prototype: hover, hold, release

This behavior was replaced by the full-canvas wave field in Phase 3. It remains
here only as design history for the discarded dispersion prototype.

The experiment rests as a completely black, empty grid when the pointer is
outside.

Pointer interaction has three explicit stages:

1. Hover renders one light `░` glyph in dark gray at the hovered cell.
2. Hold locks that cell, changes it to phosphor green, and steps its shape
   through `░ → ▒ → ▓`.
3. Release makes the locked cell the center of a distance-delayed outward
   dispersion.

The hint and charge are literal glyph-atlas states. They are not a cursor
circle, CSS layer, or separately drawn marker.

Every reached cell runs the same finite block-index sequence:

```text
░ → ▒ → ▓ → blank
```

The cell arrival time is determined by its Euclidean distance from the click:

```glsl
float localTime =
  eventAge -
  normalizedDistance * u_spread +
  stableCellJitter;
```

`localTime` is divided by `u_step_duration` to select the block state. The
lightest shade therefore forms the outward front; `▒` and `▓` densify behind it
before the cell returns to true black.

Stable per-cell jitter may slightly break the frontier, but it never changes
during the event. The interaction uses no color fade, glow, circle, particle
layer, or graphic overlay.

The latest hold replaces the active event. With reduced motion, hold displays a
single green `▓`, and release shows one simultaneous static dispersion snapshot
for a short pulse before returning to black.

## 10. First material proof

Implementation begins with a static proof, not a finished sketch and not an
interface composition.

The proof contains only:

1. An enlarged four-cell atlas preview.
2. Measured alpha coverage and normalized levels.
3. A continuous black-to-white ramp with dither disabled.
4. The same ramp with full Bayer 4×4 dither.
5. A test field combining broad gradients with one hard diagonal edge.

This exposes the failures that matter: wrong font, bad glyph alignment,
non-monotonic coverage, endpoint bias, crawling Bayer coordinates, blurred
masks, and source-detail loss.

Only after this proof is accepted do we add the pointer wake.

## 11. Reusable implementation shape

The existing Rhizome Field already supplies the useful WebGL pattern: a source
framebuffer, a canvas-built glyph atlas, and a full-screen composite pass. Its
eight-character Geist ramp and luminance-noise quantizer must not be copied.

Proposed modules:

```text
src/sketches/blocktype-dither.js
src/sketches/shared/block-glyph-atlas.js
src/sketches/shaders/blocktype-composite.js
```

Responsibilities:

- `blocktype-dither.js`: source field, sketch lifecycle, controls, pointer event;
- `block-glyph-atlas.js`: font readiness, pitch-sized atlas, coverage
  calibration, texture upload;
- `blocktype-composite.js`: tone shaping, Bayer quantization, pointer index
  mutation, glyph lookup, monochrome output.

The existing `block-terminal-lcd.js` is replaced rather than extended. Keeping
both would preserve the rejected visual direction in the sketch list.

## 12. Implementation gates

### Phase 1 — static material

- rasterize the production atlas;
- display measured coverage;
- render undithered and dithered test ramps;
- validate at several pitches and DPR values.

Gate: approve the literal glyph material before any motion work.

### Phase 2 — reusable compositor

- accept an arbitrary source texture;
- implement tone shaping and adjacent-level quantization;
- add only the five material controls;
- verify resize and coordinate stability.

Gate: a static source is recognizable and never crawls.

### Phase 3 — Gerstner wave field

- sum six directional waves with distinct wavelengths and amplitudes;
- use a trochoidal phase warp controlled by crest steepness;
- derive reflection, specular response, and crest foam from the analytic
  height gradient;
- perspective-warp the sampling plane so distant waves compress naturally;
- add a restrained pointer wake without binding an action to clicks;
- freeze directional phase for reduced motion;
- keep every visible mark in the blank / `░` / `▒` / `▓` atlas.

Gate: the moving surface must read through blocktype density and crest shape,
not as an image with an ASCII filter drawn over it.

### Phase 4 — sketchbook integration

- replace the rejected terminal-node sketch;
- preserve seeded output and PNG export;
- use the existing sketchbook controls without drawing UI into the canvas;
- remove obsolete terminal-node copy from the registry and documentation.

## 13. Acceptance criteria

### Material

- Only blank, `░`, `▒`, and `▓` construct the image.
- The production atlas uses Departure Mono.
- Measured glyph coverage is strictly increasing.
- Source black maps to blank and source white maps to `▓`.
- A continuous ramp remains visually continuous when dithering is enabled.
- Actual shade-block patterns remain legible at close range.
- No glow, scanlines, subpixels, labels, borders, or terminal illustration are
  present.

### Stability

- A static source produces no flicker or Bayer crawl.
- Pitch changes preserve a crisp one-to-one atlas/display relationship.
- Resize and DPR changes keep the cell origin stable.
- The source is recognizable from normal viewing distance.

### Interaction

- Pointer movement creates a restrained local wake.
- Clicking the canvas has no sketch behavior.
- Reduced motion preserves a static, readable surface.

### Performance

- One source pass and one compositor pass.
- No per-frame atlas rebuild.
- Stable `60 FPS` at `1440 × 900` CSS pixels with DPR capped at `2`.
- Context loss leaves the sketchbook’s readable fallback intact.

## 14. Locked direction

```text
states       blank + ░ + ▒ + ▓
font         Departure Mono
dither       coverage-aware Bayer 4×4 between adjacent states
color        calibrated grayscale wave tones over black
pointer      local wake; clicks unbound
renderer     analytic WebGL wave field + calibrated glyph compositor
first gate   static atlas and tonal-ramp proof
```

The implementation follows this material definition directly.
