# SVG To 3D ASCII Turntable Spec

Use this when converting a flat SVG logo into an extruded 3D turntable and then rendering it as ASCII.

## Goal

Create a real 3D object from an SVG mark, rotate it in an infinite turntable, and show only the ASCII shader output. The underlying WebGL render is a sampling source, not the final visible object.

## Required Stack

- Use `three` for the 3D scene, extrusion, lighting, camera, and turntable animation.
- Use `THREE.ExtrudeGeometry` for actual depth.
- Use a hidden WebGL canvas as the source buffer.
- Use a visible `<pre>` or text canvas for ASCII output.

Do not fake 3D with a flat SVG overlay, repeated SVG shadows, CSS transforms, or layered 2D images.

## SVG Preparation

1. Inspect the SVG paths and viewBox.
2. Confirm the mark is filled geometry, not only strokes.
3. If the SVG uses strokes, convert strokes to outlines before extrusion.
4. If `SVGLoader` produces broken holes or open walls, manually convert the path into `THREE.Shape` commands.
5. Keep the source SVG in `public/` only as a reference or fallback, not as a visible overlay.

For PAVE, the reliable path was manual shape construction:

```js
const shape = new THREE.Shape();
shape.moveTo(307.88, 156.97);
shape.lineTo(307.88, 131.72);
shape.bezierCurveTo(309.89, 46.64, 230.11, 49.48, 192.63, 49.48);
// ...
shape.closePath();
```

## Extrusion

Use a front material and a side material so depth reads clearly in the sampled lighting:

```js
const geometry = new THREE.ExtrudeGeometry(shape, {
  depth,
  bevelEnabled: bevel > 0,
  bevelThickness: bevel,
  bevelSize: bevel * 0.66,
  bevelSegments: 8,
  curveSegments: 36
});

const mesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial]);
```

Rules:

- Rebuild geometry when `depth`, `bevel`, or `renderSize` changes.
- Dispose old geometries on rebuild.
- Normalize the group to its bounding box center.
- Flip Y once when mapping SVG coordinates into Three.js space.
- Keep outer walls filled. If walls appear open, the shape path is not closed or the SVG path conversion is wrong.

## Scene Setup

Use an opaque renderer for stable sampling:

```js
const renderer = new THREE.WebGLRenderer({
  alpha: false,
  antialias: true,
  preserveDrawingBuffer: true
});

renderer.setClearColor(0xfbfbf8, 1);
```

Important: Do not make the WebGL clear buffer transparent for this effect. Transparent buffers can make antialiasing and empty pixels sample unpredictably, which creates artifacts and noisy glyph fields. Hide the WebGL canvas with CSS instead.

Recommended lighting:

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.86));

const key = new THREE.DirectionalLight(0xffffff, 4.6);
key.position.set(2.8, 3.4, 4.2);

const rim = new THREE.DirectionalLight(0xffffff, 3.2);
rim.position.set(-2.4, 1.6, -4.8);

const fill = new THREE.DirectionalLight(0xd7d2bd, 2.0);
fill.position.set(-3.2, -0.8, 2.6);
```

## Turntable Animation

The object should rotate continuously:

```js
const elapsed = clock.getElapsedTime();
mark.rotation.y = elapsed * Math.PI * controls.speed;
mark.rotation.z = -0.08 + Math.sin(elapsed * 0.55) * 0.018;
```

Respect reduced motion:

```js
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const elapsed = reduceMotion.matches ? 1.0 : clock.getElapsedTime();
```

## ASCII Sampling

Use the hidden WebGL canvas as the source:

```js
sampleContext.drawImage(renderer.domElement, 0, 0, cols, rows);
const pixels = sampleContext.getImageData(0, 0, cols, rows).data;
```

Compute luma:

```js
const luma = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
```

For dark logo on light background:

```js
if (luma > 0.965) {
  line += " ";
  continue;
}

const darkness = 1 - luma;
```

This keeps the cream background empty and preserves the mark silhouette.

## Character Ramps

Use the correct ramp for the target surface.

Landing/header shader family:

```js
const LANDING_ASCII_RAMP = [" ", "·", "•", "+", "*", "✦", "✶", "✷", "✸", "✹"];
```

Case-study card/header mark family:

```js
const HEADER_ASCII_RAMP = [" ", ".", "-", "_", "/", "\\", "|", ">", "#"];
```

Do not blindly use the full landing ramp across a 3D logo. It can make the logo read as a noisy texture. Clamp `glyphDetail` for clarity:

```js
const maxRampIndex = Math.min(ramp.length - 1, Math.max(2, Math.round(controls.glyphDetail)));
line += ramp[Math.min(maxRampIndex, Math.max(1, Math.floor(tone * maxRampIndex)))];
```

Default `glyphDetail` should be conservative, around `3-5`, then user-tunable.

## Hiding WebGL

The WebGL canvas must exist and render, but should not be visible:

```css
.turntable-stage canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
```

Do not use `display: none`; it can break sizing and sampling.

## Hover Effect

Match the landing page header interaction by writing hover energy into the ASCII grid, not by showing the WebGL object.

Pointer to grid:

```js
const x = ((event.clientX - rect.left) / rect.width) * (cols - 1);
const y = ((event.clientY - rect.top) / rect.height) * (rows - 1);
```

Trail decay:

```js
const decay = Math.exp(-delta / 520);
trailBuffer[i] *= decay;
```

Apply hover as a small tone boost:

```js
const tone = clamp(baseTone + trail * controls.hover, 0, 1);
```

Keep `hover` tunable. A safe default is `0.2-0.35`.

## Controls

Expose controls for iteration:

- `speed`: turntable rotation speed.
- `depth`: extrusion depth.
- `bevel`: bevel thickness.
- `density`: ASCII sampling density.
- `renderSize`: 3D logo scale before sampling.
- `brightness`: tone offset.
- `contrast`: tone multiplier.
- `glyphDetail`: max ramp index / detail level.
- `hover`: hover trail intensity.
- `glow`: CSS text-shadow amount.

Use output labels beside each range input.

## Settings Export

Always include a copyable settings payload so the current look can be pasted back into Codex or stored in content.

Recommended format:

```json
{
  "renderer": "pave-symbol-turntable",
  "version": 1,
  "ramp": "landing",
  "controls": {
    "speed": 0.38,
    "depth": 64,
    "bevel": 5.8,
    "density": 10,
    "renderSize": 1,
    "brightness": 0,
    "contrast": 1.35,
    "glyphDetail": 4,
    "hover": 0.34,
    "glow": 0.18
  }
}
```

Use a readonly `<textarea>` plus a `Copy settings` button.

## Failure Modes

- Logo is a messy blob: density too high, glyph ramp too broad, or shader sampling includes background noise.
- Logo disappears: scale/camera wrong, WebGL failed, or canvas was hidden with `display: none`.
- Flat logo overlays 3D logo: remove fallback `<img>` after WebGL is working.
- Clipped geometry: camera too close, renderSize too high, or stage overflow/crop is wrong.
- Open side walls: SVG path is not closed or stroke was not converted to outline.
- Noisy artifacts after making renderer transparent: restore `alpha: false` and an opaque clear color.

## Validation

Before calling it done:

1. Run `node --check` on the turntable script.
2. Run `npm run build`.
3. Open the route in browser.
4. Confirm only ASCII is visible.
5. Confirm the hidden WebGL object is still sampled.
6. Confirm controls update live.
7. Confirm settings export reflects current controls.
8. Confirm the silhouette remains readable at default settings.

## Current Repo Files

- `src/scripts/pave-symbol-turntable.js`: Three.js extrusion and ASCII sampler.
- `src/pages/pave-turntable.astro`: full-screen turntable route and controls.
- `src/components/ProjectMark.astro`: card-sized PAVE mark.
- `src/styles/global.css`: stage, hidden WebGL canvas, ASCII output, controls.
- `docs/ascii-shader-system.md`: general ASCII shader system notes.
