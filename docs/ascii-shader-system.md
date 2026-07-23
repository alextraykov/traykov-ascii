# ASCII Shader System

Reusable notes for the ASCII shader work in this repo. Source page: `/shader-explainer/`. Current implementation: `public/ascii-shader.js`.

This document covers the older general pixel-to-ASCII renderer. The approved homepage portrait interaction, including velocity-driven glyph lifting, density decay, structural underprint, click dispersal, and regeneration, is documented separately in [`turntable-ascii-interaction-language.md`](./turntable-ascii-interaction-language.md).

## Mental Model

The shader is a two-stage renderer:

1. A tiny WebGL canvas renders a grayscale light field.
2. JavaScript reads the pixels from that canvas and maps each sampled cell to a character.

The WebGL canvas is source data. The visible layer should be ASCII. If a shader uses an underlying 3D/WebGL object, hide that canvas in the UI and only expose the sampled ASCII output.

## Pipeline

```text
fragment shader
  -> tiny grayscale canvas
  -> readPixels / drawImage sampling
  -> brightness per grid cell
  -> dither + interaction offsets
  -> ramp index
  -> monospace <pre> or canvas text
```

The explainer page names this as: fragment shader, read pixels, quantize, symbol index.

## Fragment Field

The default shader builds a grayscale field from:

- `uv`: normalized fragment coordinates.
- `p`: centered coordinates with aspect correction.
- `u_time`: slow animation driver.
- `fbm`: layered value noise.
- `ripple`: radial sine wave.
- `depth`: center falloff.
- `core`: bright thresholded feature area.

The current tone formula:

```glsl
float tone = clamp(
  0.035
  + depth * 0.42
  + field * 0.32
  + warp * 0.24
  + ripple * 0.08
  + core * 0.22,
  0.0,
  1.0
);
```

This produces a grayscale canvas. It is intentionally low-resolution because one WebGL pixel roughly maps to one ASCII cell.

## Character Ramps

The current full shader ramp is:

```js
const ASCII_RAMP = " ·•+*✦✶✷✸✹";
```

Ramp ordering matters. The first character is darkest or emptiest, and the last character is brightest or densest.

For the portfolio card/header style, use only the header character family:

```js
const HEADER_ASCII_RAMP = [" ", ".", "-", "_", "/", "\\", "|", ">", "#"];
```

Use this ramp when the output needs to match the case-study card mark:

```text
     .--------.
  .-'  .----.  '-.
 /   ###----###   \
|    ##      ###    |
|    ##       ##>   |
|    ##########     |
|    ##             |
|    ##    ####     |
 \       ####      /
  '-.___________.-'
```

## Sampling

For shader stages, sample with `gl.readPixels`.

For Three.js or other rendered sources, sampling can use a hidden source canvas:

```js
sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
```

Then compute luma:

```js
const brightness = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
```

For light-on-dark ASCII, map brightness directly to the ramp. For dark-on-light ASCII, use darkness:

```js
const darkness = 1 - brightness;
```

## Dither

Use a 4x4 Bayer matrix to break up banding:

```js
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
].map((value) => (value + 0.5) / 16);
```

The dither offset is small and local:

```js
const dither = (BAYER_4[(x % 4) + (y % 4) * 4] - 0.5) * 0.22;
const tone = clamp(brightness + dither, 0, 1);
```

Motion can be added with a tiny sine term, but keep it subtle. The dither should texture the image, not flicker over it.

## Interaction

The hero shader uses the same ASCII grid for interaction:

- Pointer move writes to `trailBuffer`.
- Pointer down injects energy into `waveCurrent`.
- Trails decay exponentially.
- Waves update with a simple neighbor simulation.

Trail decay:

```js
const decay = Math.exp(-delta / 520);
trailBuffer[i] *= decay;
```

Wave update:

```js
const neighborAverage =
  (current[i - 1] + current[i + 1] + current[i - cols] + current[i + cols]) * 0.5;
const next = (neighborAverage - previous[i]) * damping;
```

Use interaction offsets as brightness boosts:

```js
const adjusted = Math.min(1, brightness + wave * 0.22 + (trail > 0.08 ? 0.16 : 0));
```

## Masked Marks

The older PAVE card shader uses a text mask:

```js
const PAVE_MARK_MASK = [
  "     ***********     ",
  "   ***************   ",
  "  *****      ******  ",
  " ****         *****  ",
  " ****         *****  ",
  " ****      ******    ",
  " **************      ",
  " ****               ",
  " ****     ******     ",
  "  ****   ******      ",
  "   **********        ",
  "     ******          "
];
```

Mask rule:

```js
if (maskLine[x] === " ") {
  line += " ";
} else {
  line += ramp[rampIndex];
}
```

For logo work, prefer geometric or rendered-source sampling when the mark must stay faithful. Use mask strings only for small decorative card marks.

## Controls To Expose

For reusable shader playgrounds, expose these controls:

- `speed`: animation time multiplier.
- `density`: pixel-to-character sampling step.
- `brightness`: tone offset before ramp mapping.
- `contrast`: tone multiplier around mid-gray.
- `dither`: Bayer offset amount.
- `glow`: text-shadow amount, not shader brightness.
- `renderSize`: scale or camera size of the underlying rendered source before ASCII sampling.
- `depth`: for extruded 3D logos.
- `bevel`: for extruded 3D logos.

The visual source can be invisible while still sampled. Make source canvases `opacity: 0`, `visibility: hidden`, or position them offscreen only after confirming they still render. `display: none` will break canvas sizing and sampling.

## Layout Rules

Use a stable stage:

```css
.ascii-stage {
  position: relative;
  overflow: hidden;
}

.ascii-stage canvas {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.ascii-stage pre {
  position: absolute;
  inset: 0;
  margin: 0;
  overflow: hidden;
  font-family: var(--mono);
  letter-spacing: 0;
  white-space: pre;
  pointer-events: none;
}
```

Do not scale font size with viewport units. Compute font size from `stageWidth / cols` and line height from `stageHeight / rows`.

## Implementation Checklist

- Render source at ASCII-grid resolution when possible.
- Keep the source canvas hidden if the intended output is ASCII-only.
- Resize source, buffers, and `<pre>` typography together.
- Clamp tone before ramp lookup.
- Keep dither and motion subtle.
- Respect `prefers-reduced-motion`.
- Keep a fallback string for missing WebGL.
- Dispose Three.js geometry when rebuilding extrusions.
- Avoid flat SVG/image overlays once the 3D source exists, or they will read as double exposure.

## File Map

- `src/pages/shader-explainer.astro`: visual explanation page.
- `public/ascii-shader.js`: hero shader, interaction layer, and older masked card mark.
- `src/scripts/pave-symbol-turntable.js`: Three.js source rendered into ASCII for the PAVE symbol.
- `src/pages/pave-turntable.astro`: controlled PAVE turntable playground.
