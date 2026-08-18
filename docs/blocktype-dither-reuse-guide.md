# Reusing the Blocktype Wave Dither

This is the practical transplant guide for the wave effect used by the
`blocktype-dither` sketch and the “On digital art” note.

The effect is a click-free, animated WebGL wave field rendered through four
literal character states:

```text
blank → ░ → ▒ → ▓
```

It is not a CSS texture and it is not a conventional ASCII filter. Six
trochoidal wave components produce height, normals, reflections, and foam.
Those continuous tones are then quantized between measured glyph coverages
with a stable 4×4 Bayer matrix. The result stays readable as an image from a
distance and resolves into actual blocktype glyphs up close.

For the material rationale and shader math, read
[blocktype-dither-shader-spec.md](./blocktype-dither-shader-spec.md).

## 1. Portable files

Copy these three modules while preserving their relative directories:

```text
effects/
├── blocktype-dither.js
├── shaders/
│   └── blocktype-composite.js
└── shared/
    └── block-glyph-atlas.js
```

Their sources in this project are:

- [`src/sketches/blocktype-dither.js`](../src/sketches/blocktype-dither.js):
  WebGL setup, palette, uniforms, lifecycle, and wave parameters.
- [`src/sketches/shaders/blocktype-composite.js`](../src/sketches/shaders/blocktype-composite.js):
  full-screen vertex shader, wave field, lighting, foam, Bayer quantization,
  and glyph compositing.
- [`src/sketches/shared/block-glyph-atlas.js`](../src/sketches/shared/block-glyph-atlas.js):
  creates the pitch-sized `░▒▓` atlas and measures the font’s real alpha
  coverage.

Also copy:

```text
public/fonts/DepartureMono-Regular.woff2
```

The modules have no npm dependencies. They require browser APIs only:
Canvas 2D, WebGL 1, `document.fonts`, `ResizeObserver`,
`IntersectionObserver`, and `requestAnimationFrame`.

The font is a separate asset from the code. Preserve its applicable copyright
and license information when moving it to another project.

## 2. Load the font

The glyph atlas expects the family name `Departure Mono Local`.

```css
@font-face {
  font-family: "Departure Mono Local";
  src: url("/fonts/DepartureMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

Do not rename the family without also changing `FONT_FAMILY` in
`block-glyph-atlas.js`.

The atlas is rebuilt after the font loads. A missing font will fall back to
`monospace`, but the measured coverage, alignment, and visual character will
not match the approved effect.

## 3. Add the canvas

```html
<canvas
  id="blocktype-wave"
  width="1280"
  height="800"
  role="img"
  aria-label="Animated waves rendered with blank, light, medium, and heavy blocktype glyphs."
></canvas>
```

```css
#blocktype-wave {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  background: #000;
}
```

The HTML dimensions are only a no-JavaScript fallback. The mount code must
keep the canvas backing resolution synchronized with its rendered CSS size.

## 4. Mount it

This example is framework-neutral, has no click behavior, pauses outside the
viewport, caps device-pixel ratio at `2`, and releases its GPU resources.

```js
import { createSketch } from "./effects/blocktype-dither.js";

const canvas = document.querySelector("#blocktype-wave");
const context = canvas?.getContext("2d", { alpha: false });

if (!(canvas instanceof HTMLCanvasElement) || !context) {
  throw new Error("The blocktype wave canvas could not be initialized.");
}

const params = {
  pitch: 8,
  waveScale: 1.15,
  amplitude: 1.25,
  steepness: 0.59,
  speed: 0.45,
  contrast: 0.85
};

const pointer = {
  x: 0.5,
  y: 0.5,
  inside: false
};

const sketch = createSketch({
  canvas,
  context,
  params,
  pointer,
  seed: 25502,
  setStatus(message) {
    console.debug("[blocktype-wave]", message);
  }
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 1;
let height = 1;
let dpr = 1;
let elapsed = 0;
let previousTime = 0;
let frameId = 0;
let visible = false;
let destroyed = false;

const shouldAnimate = () =>
  visible && !reducedMotion.matches && !document.hidden && !destroyed;

function frame(now) {
  frameId = 0;

  const delta = previousTime
    ? Math.min(0.1, (now - previousTime) / 1000)
    : 0;

  previousTime = now;

  if (!reducedMotion.matches) {
    elapsed += delta;
  }

  sketch.frame?.({ time: elapsed, delta, width, height, dpr });

  if (shouldAnimate()) {
    frameId = requestAnimationFrame(frame);
  }
}

function requestFrame() {
  if (!frameId && !document.hidden && !destroyed) {
    frameId = requestAnimationFrame(frame);
  }
}

function resize() {
  const bounds = canvas.getBoundingClientRect();

  width = Math.max(1, Math.round(bounds.width));
  height = Math.max(1, Math.round(bounds.height));
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  sketch.resize?.({ width, height, dpr });
  previousTime = 0;
  requestFrame();
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();

  pointer.x = Math.min(
    1,
    Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width))
  );
  pointer.y = Math.min(
    1,
    Math.max(0, (event.clientY - bounds.top) / Math.max(1, bounds.height))
  );
  pointer.inside = true;
  requestFrame();
}

function leavePointer() {
  pointer.inside = false;
  requestFrame();
}

function handleVisibility() {
  previousTime = 0;

  if (!document.hidden && visible) {
    requestFrame();
  }
}

function handleMotionPreference() {
  previousTime = 0;
  requestFrame();
}

const resizeObserver = new ResizeObserver(resize);
const intersectionObserver = new IntersectionObserver(
  ([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    previousTime = 0;

    if (visible) {
      requestFrame();
    }
  },
  { rootMargin: "120px 0px" }
);

canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerenter", updatePointer);
canvas.addEventListener("pointerleave", leavePointer);
document.addEventListener("visibilitychange", handleVisibility);
reducedMotion.addEventListener("change", handleMotionPreference);

resizeObserver.observe(canvas);
intersectionObserver.observe(canvas);
resize();

export function destroyBlocktypeWave() {
  if (destroyed) return;

  destroyed = true;
  cancelAnimationFrame(frameId);
  resizeObserver.disconnect();
  intersectionObserver.disconnect();
  canvas.removeEventListener("pointermove", updatePointer);
  canvas.removeEventListener("pointerenter", updatePointer);
  canvas.removeEventListener("pointerleave", leavePointer);
  document.removeEventListener("visibilitychange", handleVisibility);
  reducedMotion.removeEventListener("change", handleMotionPreference);
  sketch.destroy?.();
}

window.addEventListener("pagehide", destroyBlocktypeWave, { once: true });
```

For React, Vue, Svelte, or another component framework, put the mount code in
the component’s client-side lifecycle and call `destroyBlocktypeWave()` from
its cleanup hook. Do not initialize it during server rendering.

## 5. The approved preset

The “On digital art” note uses:

| Parameter | Value | What it changes |
| --- | ---: | --- |
| `pitch` | `8` | CSS-pixel size of each glyph cell |
| `waveScale` | `1.15` | density and wavelength of the wave system |
| `amplitude` | `1.25` | vertical wave height |
| `steepness` | `0.59` | crest compression and highlight sharpness |
| `speed` | `0.45` | phase speed |
| `contrast` | `0.85` | separation between dark water, reflections, and foam |
| `seed` | `25502` | deterministic wave phase; hexadecimal `0000639E` |

The sketchbook’s supported control ranges are:

| Parameter | Range |
| --- | --- |
| `pitch` | `8–22`, step `1` |
| `waveScale` | `0.5–2.4`, step `0.05` |
| `amplitude` | `0.2–1.25`, step `0.05` |
| `steepness` | `0–1`, step `0.01` |
| `speed` | `0.15–1.6`, step `0.05` |
| `contrast` | `0.55–1.8`, step `0.05` |

`params` is a live object. A control panel can mutate its values without
recreating the sketch. The next frame will use the new values.

## 6. Interaction choices

The approved version has no click action.

The pointer object only controls the restrained local hover wake. To keep that
behavior, use the three pointer listeners in the example. To make the effect
completely non-interactive:

```js
const pointer = { x: 0.5, y: 0.5, inside: false };
```

Then omit all pointer listeners. Do not add `touch-action: none` unless the
canvas genuinely needs touch gestures; it would unnecessarily block page
scrolling.

## 7. Changing the colors

The calibrated palette lives near the top of `blocktype-dither.js`:

```js
const BACKGROUND = [0, 0, 0];
const WAVE_DARK = [38 / 255, 44 / 255, 41 / 255];
const WAVE_LIGHT = [150 / 255, 164 / 255, 154 / 255];
const FOAM = [246 / 255, 249 / 255, 246 / 255];
```

These correspond to:

```text
background  #000000
wave dark   #262C29
wave light  #96A49A
foam        #F6F9F6
```

Keep the background genuinely dark and preserve increasing luminance from
`WAVE_DARK` through `FOAM`. The glyph atlas controls physical coverage; the
palette controls the light carried by that coverage.

Avoid adding glow, scanlines, opacity fades, or an LCD grid on top. Those
effects double-encode tone and make the literal block glyphs look decorative
instead of structural.

## 8. Why the atlas matters

Do not replace the atlas with a hard-coded assumption that `░`, `▒`, and `▓`
cover exactly 25%, 50%, and 75% of a cell.

`block-glyph-atlas.js`:

1. rasterizes each glyph at the final physical cell pitch;
2. measures mean alpha over every tile;
3. normalizes the levels against the measured `▓` coverage;
4. sends those levels to the shader; and
5. uses nearest-neighbor sampling with no mipmaps.

The shader dithers only between adjacent measured states. That is what keeps
gradients ordered and prevents a tone from jumping directly from `░` to `▓`.

## 9. Performance rules

- Cap DPR at `2`. A full-window canvas at unrestricted Retina resolution is
  an unnecessary fragment-shader cost.
- Pause the animation when the canvas is outside the viewport or the document
  is hidden.
- Rebuild the glyph atlas only when pitch, DPR, or font changes.
- Keep the Bayer matrix anchored to integer cell coordinates. Moving the
  threshold pattern over time produces shimmer.
- Keep `imageSmoothingEnabled = false` on the visible 2D context.
- Run only one animation loop per mounted canvas.
- Always call `destroy()` when a component unmounts.

The current portable API renders WebGL to an internal canvas and copies the
result to the supplied 2D canvas. This matches the sketchbook’s common
renderer contract and makes PNG export reliable. For a large production site
with several simultaneous instances, a future direct-to-WebGL variant would
remove that per-frame copy.

## 10. Failure checks

If the result looks wrong, check these in order:

1. **Wrong font:** confirm `DepartureMono-Regular.woff2` loads and the CSS
   family name is exactly `Departure Mono Local`.
2. **Soft glyphs:** confirm the canvas backing dimensions include DPR and the
   atlas texture still uses `NEAREST`.
3. **Crawling dither:** confirm Bayer coordinates come from the integer glyph
   cell, not time or fragment-local noise.
4. **Incorrect pointer direction:** DOM pointer Y is top-down; the renderer
   flips it before sending `u_pointer_uv`.
5. **Too gray:** restore the calibrated palette and reduce `contrast`.
6. **Too busy:** raise `pitch` before reducing all wave detail.
7. **High GPU cost:** confirm the canvas pauses offscreen and DPR is capped.
8. **No WebGL:** catch initialization failure and leave a black canvas or
   replace it with a static poster image.

## 11. Reuse checklist

- Copy the three JavaScript modules with their directory structure intact.
- Copy and load Departure Mono.
- Add one responsive canvas.
- Mount only in the browser.
- Use the approved preset as the starting point.
- Keep click unbound.
- Choose hover wake or a fully passive pointer.
- Cap DPR, pause offscreen, and clean up on unmount.
- Test at narrow and wide sizes.
- Test reduced motion.
- Verify the console is free of shader and font errors.
